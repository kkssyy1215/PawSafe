import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HeatSegment } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';
import type { RouteMapProps } from './NativeMap';
import { getRecommendedRouteColor } from './routeStyles';

const segmentColors: Record<HeatSegment['level'], string> = { low: colors.low, medium: colors.medium, high: colors.high, unknown: colors.unknown };

export function MockMap({ origin, destination, shortest, pawsafe, segments, selectedSegmentId, walkMode = 'cool', onSegmentPress }: RouteMapProps) {
  if (!shortest && !pawsafe && !segments?.length) return <View style={styles.map}><Text style={styles.empty}>표시할 MVP 경로가 없습니다.</Text></View>;
  return (
    <View accessible accessibilityLabel={`MVP 지도 예시, ${origin.name}에서 ${destination.name}까지`} style={styles.map}>
      <View style={styles.park}><Text style={styles.parkText}>공원</Text></View>
      <View style={[styles.road, styles.roadOne]} /><View style={[styles.road, styles.roadTwo]} /><View style={[styles.road, styles.roadThree]} /><View style={[styles.road, styles.roadFour]} />
      {shortest ? <><View style={[styles.route, styles.shortestOne]} /><View style={[styles.route, styles.shortestTwo]} /></> : null}
      {pawsafe ? <><View style={[styles.route, styles.pawsafeOne, { backgroundColor: getRecommendedRouteColor(walkMode) }]} /><View style={[styles.route, styles.pawsafeTwo, { backgroundColor: getRecommendedRouteColor(walkMode) }]} /><View style={[styles.route, styles.pawsafeThree, { backgroundColor: getRecommendedRouteColor(walkMode) }]} /></> : null}
      {segments?.map((segment, index) => <Pressable key={segment.edge_id} accessibilityRole="button" accessibilityLabel={`${segment.display_name}, 구간 상세 보기`} hitSlop={8} onPress={() => onSegmentPress?.(segment.edge_id)} style={[styles.segment, { top: 84 + index * 34, left: 55 + index * 40, backgroundColor: segmentColors[segment.level], height: selectedSegmentId === segment.edge_id ? 10 : 7, transform: [{ rotate: index % 2 ? '-9deg' : '16deg' }] }]} />)}
      <View style={[styles.marker, styles.start]}><Text style={styles.markerText}>출발</Text></View><View style={[styles.marker, styles.end]}><Text style={styles.markerText}>도착</Text></View>
      <Text style={styles.badge}>MVP 지도 예시</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  map: { height: 300, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#EDE9DC' }, empty: { ...typography.body, color: colors.mutedText, textAlign: 'center', marginTop: 130 },
  park: { position: 'absolute', right: 15, top: 18, width: 130, height: 105, borderRadius: 42, backgroundColor: '#CBDCCB', transform: [{ rotate: '-8deg' }] }, parkText: { ...typography.caption, color: colors.greenStrong, margin: spacing.lg },
  road: { position: 'absolute', height: 18, backgroundColor: '#D4D0C5', borderWidth: 1, borderColor: '#C1BCAF' }, roadOne: { width: 350, top: 155, left: -20, transform: [{ rotate: '-13deg' }] }, roadTwo: { width: 320, top: 80, left: -70, transform: [{ rotate: '35deg' }] }, roadThree: { width: 270, top: 238, left: 110, transform: [{ rotate: '-42deg' }] }, roadFour: { width: 180, top: 56, left: 170, transform: [{ rotate: '71deg' }] },
  route: { position: 'absolute', height: 7, borderRadius: 4 }, shortestOne: { width: 180, top: 180, left: 32, backgroundColor: colors.routeBaseline, transform: [{ rotate: '-9deg' }] }, shortestTwo: { width: 126, top: 145, left: 185, backgroundColor: colors.routeBaseline, transform: [{ rotate: '-28deg' }] },
  pawsafeOne: { width: 105, top: 173, left: 35, transform: [{ rotate: '-30deg' }] }, pawsafeTwo: { width: 135, top: 118, left: 115, transform: [{ rotate: '-6deg' }] }, pawsafeThree: { width: 92, top: 101, left: 227, transform: [{ rotate: '-34deg' }] },
  segment: { position: 'absolute', width: 84, borderRadius: 5, zIndex: 6 },
  marker: { position: 'absolute', minWidth: 48, minHeight: 28, borderRadius: 14, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, zIndex: 10 }, start: { left: 20, bottom: 88 }, end: { right: 22, top: 64 }, markerText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  badge: { position: 'absolute', left: spacing.sm, top: spacing.sm, ...typography.caption, color: colors.text, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
});
