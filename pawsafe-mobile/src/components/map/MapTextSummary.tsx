import { StyleSheet, Text, View } from 'react-native';
import type { HeatSegment, Place, RouteStats, WalkMode } from '@/src/api/contracts';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { colors, spacing, typography } from '@/src/theme/theme';
import { getWalkModeLabel } from '@/src/features/walk/utils/walkModeCopy';

export function MapTextSummary({ origin, destination, shortest, pawsafe, segments, walkMode = 'cool' }: { origin: Place; destination: Place; shortest?: RouteStats; pawsafe?: RouteStats; segments?: HeatSegment[]; walkMode?: WalkMode }) {
  const counts = segments?.reduce<Record<HeatSegment['level'], number>>((all, segment) => ({ ...all, [segment.level]: all[segment.level] + 1 }), { low: 0, medium: 0, high: 0, unknown: 0 });
  const recommendedLabel = getWalkModeLabel(walkMode);
  const routeText = shortest && pawsafe ? `일반 최단 경로 ${formatDistance(shortest.distance_m)}, ${recommendedLabel} ${formatDistance(pawsafe.distance_m)}.` : pawsafe ? `${recommendedLabel} ${formatDistance(pawsafe.distance_m)}.` : '';
  const segmentText = counts ? ` 구간은 열노출 낮음 ${counts.low}개, 보통 ${counts.medium}개, 높음 ${counts.high}개, 정보 부족 ${counts.unknown}개입니다.` : '';
  return <View accessible style={styles.container}><Text style={styles.title}>지도 텍스트 요약</Text><Text style={styles.text}>{origin.name}에서 {destination.name}까지 {routeText}{segmentText}</Text></View>;
}
const styles = StyleSheet.create({ container: { gap: spacing.xs }, title: { ...typography.caption, color: colors.text, fontWeight: '700' }, text: { ...typography.caption, color: colors.mutedText } });
