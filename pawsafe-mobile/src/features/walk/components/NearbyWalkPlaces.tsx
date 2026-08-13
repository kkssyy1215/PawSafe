import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Place, PlaceSearchResult } from '@/src/api/contracts';
import { useNearbyWalkPlaces } from '@/src/features/walk/hooks/useNearbyWalkPlaces';
import { distanceBetweenPlaces, formatNearbyDistance, sortNearbyWalkPlaces } from '@/src/features/walk/utils/nearbyPlaces';
import { colors, spacing, typography } from '@/src/theme/theme';

interface NearbyWalkPlacesProps {
  origin: Place | null;
  selected: Place | null;
  onSelect: (place: PlaceSearchResult) => void;
}

export function NearbyWalkPlaces({ origin, selected, onSelect }: NearbyWalkPlacesProps) {
  const { places, isLoading, hasError } = useNearbyWalkPlaces(origin);
  const recommendations = useMemo(() => sortNearbyWalkPlaces(places, origin).slice(0, 5), [origin, places]);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>주변 산책로·공원</Text>
          <Text style={styles.description}>{origin ? `${origin.name}에서 가까운 순이에요.` : '출발지를 선택하면 가까운 순으로 보여드려요.'}</Text>
        </View>
        <Text accessibilityElementsHidden style={styles.leaf}>●</Text>
      </View>
      {isLoading ? <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator size="small" color={colors.greenStrong} /><Text style={styles.description}>주변 장소를 찾고 있어요.</Text></View> : null}
      {!isLoading && hasError ? <Text accessibilityLiveRegion="polite" style={styles.description}>주변 추천을 불러오지 못했어요. 위 검색창에서 직접 찾아주세요.</Text> : null}
      {!isLoading && !hasError && origin && recommendations.length === 0 ? <Text style={styles.description}>현재 분석 범위에서 추천할 장소가 없어요.</Text> : null}
      {recommendations.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list} accessibilityRole="list">
          {recommendations.map((place) => {
            const active = selected?.id === place.id;
            const distance = origin ? formatNearbyDistance(distanceBetweenPlaces(origin, place)) : null;
            const kind = place.name.includes('공원') ? '공원' : place.name.includes('숲길') ? '숲길' : '산책로';
            return (
              <Pressable
                key={place.id}
                testID={`nearby-place-${place.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${place.name}, ${kind}${distance ? `, 약 ${distance}` : ''}, 목적지로 선택`}
                style={({ pressed }) => [styles.card, active && styles.selected, pressed && styles.pressed]}
                onPress={() => onSelect(place)}
              >
                <View style={styles.kindRow}><Text style={styles.kindIcon}>{kind === '공원' ? '●' : '↝'}</Text><Text style={styles.kind}>{kind}</Text></View>
                <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.address} numberOfLines={2}>{place.address}</Text>
                <Text style={styles.distance}>{active ? '선택됨' : distance ? `약 ${distance}` : '목적지로 선택'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm }, headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, headingCopy: { flex: 1, gap: 2 },
  title: { ...typography.subheading, color: colors.text }, description: { ...typography.caption, color: colors.mutedText }, leaf: { color: colors.greenStrong, fontSize: 18 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 }, list: { gap: spacing.sm, paddingRight: spacing.md },
  card: { width: 164, minHeight: 136, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: spacing.md, gap: 4 }, selected: { borderColor: colors.greenStrong, backgroundColor: colors.greenSoft }, pressed: { opacity: 0.78 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, kindIcon: { color: colors.greenStrong, fontSize: 16, fontWeight: '700' }, kind: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' }, placeName: { ...typography.body, color: colors.text, fontWeight: '700' }, address: { ...typography.caption, color: colors.mutedText, minHeight: 38 }, distance: { ...typography.caption, color: colors.greenStrong, fontWeight: '700', marginTop: 'auto' },
});
