import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Place, PlaceSearchResult } from '@/src/api/contracts';
import { AppTextField } from '@/src/components/common/AppTextField';
import { Notice } from '@/src/components/common/Notice';
import { usePlaceSearch } from '@/src/features/walk/hooks/usePlaceSearch';
import { uniquePlacesByAddress } from '@/src/features/walk/utils/placeSearchResults';
import { colors, spacing, typography } from '@/src/theme/theme';

interface PlaceSearchFieldProps {
  label: string;
  field: 'origin' | 'destination';
  selected: Place | null;
  onSelect: (place: PlaceSearchResult | null) => void;
  placeholder?: string;
  resultFilter?: (place: PlaceSearchResult) => boolean;
}

export function PlaceSearchField({ label, field, selected, onSelect, placeholder, resultFilter }: PlaceSearchFieldProps) {
  const { query, setQuery, results, isLoading, error, minimumLength } = usePlaceSearch();
  const visibleResults = useMemo(
    () => uniquePlacesByAddress(resultFilter ? results.filter(resultFilter) : results).slice(0, 6),
    [resultFilter, results],
  );
  const prefix = field === 'origin' ? 'origin' : 'destination';
  const pinColor = field === 'origin' ? colors.greenStrong : colors.mutedText;
  const pinIcon = field === 'origin' ? 'location' : 'location-outline';
  if (selected) {
    return (
      <View style={styles.group}>
        <Text style={styles.label}>{label}</Text>
        <View accessible accessibilityLabel={`${label}, ${selected.name}, ${selected.address}`} style={styles.selected}>
          <View style={styles.pin}><Ionicons name={pinIcon} size={22} color={pinColor} /></View>
          <View style={styles.selectedText}>
            <Text style={styles.placeName} numberOfLines={1}>{selected.name}</Text>
            <Text style={styles.address} numberOfLines={1}>{selected.address}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${label} 선택 지우기`} hitSlop={8} style={styles.clear} onPress={() => { onSelect(null); setQuery(''); }}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.group}>
      <Text nativeID={`${prefix}-label`} style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <View style={styles.pin}><Ionicons name={pinIcon} size={22} color={pinColor} /></View>
        <AppTextField
          testID={`${prefix}-search-input`}
          accessibilityLabel={`${label} 검색`}
          accessibilityHint={`두 글자 이상 입력한 뒤 검색 결과에서 ${label}를 선택하세요.`}
          aria-labelledby={`${prefix}-label`}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder ?? `${label} 주소 검색`}
          style={styles.input}
        />
      </View>
      {query.trim().length > 0 && query.trim().length < minimumLength ? <Text style={styles.help}>두 글자 이상 입력해 주세요.</Text> : null}
      {isLoading ? <View accessibilityLiveRegion="polite" style={styles.searching}><ActivityIndicator size="small" color={colors.green} /><Text style={styles.help}>장소 검색 중</Text></View> : null}
      {error ? <Notice tone="error" accessibilityLiveRegion="assertive">장소를 불러오지 못했습니다. 잠시 후 다시 입력해 주세요.</Notice> : null}
      {!isLoading && !error && query.trim().length >= minimumLength && visibleResults.length === 0 ? <Text accessibilityLiveRegion="polite" style={styles.help}>등록된 목업 장소 중 일치하는 주소가 없습니다.</Text> : null}
      {visibleResults.length > 0 ? (
        <View accessibilityRole="list" style={styles.results}>
          {visibleResults.map((place) => (
            <Pressable
              key={place.id}
              testID={`${prefix}-result-${place.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${place.name}, ${place.address}`}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}
              onPress={() => { onSelect(place); setQuery(''); }}
            >
              <View style={styles.selectedText}>
                <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
              </View>
              <Text style={styles.choose}>선택</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.text, fontWeight: '700' },
  inputShell: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: spacing.sm },
  input: { flex: 1, minHeight: 50, borderWidth: 0, paddingHorizontal: 0 },
  selected: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  pin: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  selectedText: { flex: 1, minWidth: 0 },
  placeName: { ...typography.body, color: colors.text, fontWeight: '700' },
  address: { ...typography.caption, color: colors.mutedText, fontSize: 11 },
  clear: { width: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  clearText: { ...typography.heading, color: colors.mutedText, fontWeight: '400' },
  help: { ...typography.caption, color: colors.mutedText },
  searching: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  results: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' },
  result: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.greenSoft },
  choose: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
});
