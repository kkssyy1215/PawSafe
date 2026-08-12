import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Place, PlaceSearchResult } from '@/src/api/contracts';
import { AppTextField } from '@/src/components/common/AppTextField';
import { Notice } from '@/src/components/common/Notice';
import { env } from '@/src/config/env';
import { usePlaceSearch } from '@/src/features/walk/hooks/usePlaceSearch';
import { mockPlaces } from '@/src/mocks/places';
import { colors, spacing, typography } from '@/src/theme/theme';

export function PlaceSearchField({ label, field, selected, onSelect }: {
  label: string;
  field: 'origin' | 'destination';
  selected: Place | null;
  onSelect: (place: PlaceSearchResult | null) => void;
}) {
  const { query, setQuery, results, isLoading, error, minimumLength } = usePlaceSearch();
  const prefix = field === 'origin' ? 'origin' : 'destination';
  const quickPlaces = env.placeSearchMode === 'mock'
    ? mockPlaces.filter((place) => field === 'origin' ? place.id === 'place_home' : ['place_mangwon_park', 'place_mangwon_market'].includes(place.id))
    : [];
  if (selected) {
    const selectedCoverage = 'is_in_coverage' in selected ? Boolean(selected.is_in_coverage) : null;
    return (
      <View style={styles.group}>
        <Text style={styles.label}>{label}</Text>
        <View accessible accessibilityLabel={`${label}, ${selected.name}, ${selected.address}`} style={styles.selected}>
          <View style={styles.selectedText}>
            <Text style={styles.placeName} numberOfLines={1}>{selected.name}</Text>
            <Text style={styles.address} numberOfLines={1}>{selected.address}</Text>
            {selectedCoverage != null ? <Text style={[styles.coverage, !selectedCoverage && styles.outside]}>{selectedCoverage ? 'MVP 분석 범위 안' : 'MVP 분석 범위 밖'}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${label} 선택 지우기`} hitSlop={8} style={styles.clear} onPress={() => { onSelect(null); setQuery(''); }}>
            <Text style={styles.clearText}>지우기</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.group}>
      <Text nativeID={`${prefix}-label`} style={styles.label}>{label}</Text>
      <AppTextField
        testID={`${prefix}-search-input`}
        accessibilityLabel={`${label} 검색`}
        accessibilityHint={`두 글자 이상 입력한 뒤 검색 결과에서 ${label}를 선택하세요.`}
        aria-labelledby={`${prefix}-label`}
        value={query}
        onChangeText={setQuery}
        placeholder="장소 이름만 입력해도 돼요"
      />
      {query.trim().length === 0 && quickPlaces.length > 0 ? (
        <View style={styles.quickRow} accessibilityLabel={`${label} 빠른 선택`}>
          <Text style={styles.quickLabel}>빠른 선택</Text>
          {quickPlaces.map((place) => <Pressable key={place.id} testID={`${prefix}-quick-${place.id}`} accessibilityRole="button" style={styles.quickChip} onPress={() => { onSelect(place); setQuery(''); }}><Text style={styles.quickChipText}>{place.name}</Text></Pressable>)}
        </View>
      ) : null}
      {query.trim().length > 0 && query.trim().length < minimumLength ? <Text style={styles.help}>장소 이름 일부만 입력해 주세요.</Text> : null}
      {isLoading ? <View accessibilityLiveRegion="polite" style={styles.searching}><ActivityIndicator size="small" color={colors.green} /><Text style={styles.help}>장소 검색 중</Text></View> : null}
      {error ? <Notice tone="error" accessibilityLiveRegion="assertive">장소를 불러오지 못했습니다. 잠시 후 다시 입력해 주세요.</Notice> : null}
      {!isLoading && !error && query.trim().length >= minimumLength && results.length === 0 ? <Text accessibilityLiveRegion="polite" style={styles.help}>검색 결과가 없습니다.</Text> : null}
      {results.length > 0 ? (
        <View accessibilityRole="list" style={styles.results}>
          {results.map((place) => (
            <Pressable
              key={place.id}
              testID={`${prefix}-result-${place.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${place.name}, ${place.address}, ${place.is_in_coverage ? 'MVP 분석 범위 안' : 'MVP 분석 범위 밖'}`}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}
              onPress={() => { onSelect(place); setQuery(''); }}
            >
              <View style={styles.selectedText}>
                <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
              </View>
              <Text style={[styles.coverage, !place.is_in_coverage && styles.outside]}>{place.is_in_coverage ? '범위 안' : '범위 밖'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { ...typography.subheading, color: colors.text },
  selected: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft, borderRadius: 12, padding: spacing.md },
  selectedText: { flex: 1, minWidth: 0 },
  placeName: { ...typography.body, color: colors.text, fontWeight: '600' },
  address: { ...typography.caption, color: colors.mutedText },
  clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  clearText: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  help: { ...typography.caption, color: colors.mutedText },
  quickRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  quickLabel: { ...typography.caption, color: colors.mutedText, marginRight: spacing.xs },
  quickChip: { minHeight: 36, justifyContent: 'center', borderRadius: 18, paddingHorizontal: spacing.md, backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: '#CDE8D1' },
  quickChipText: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  searching: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  results: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' },
  result: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.greenSoft },
  coverage: { ...typography.caption, color: colors.greenStrong, fontWeight: '600' },
  outside: { color: colors.error },
});
