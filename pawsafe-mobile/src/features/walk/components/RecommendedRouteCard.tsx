import { StyleSheet, Text, View } from 'react-native';
import type { RouteStats, WalkMode } from '@/src/api/contracts';
import { AppCard } from '@/src/components/common/AppCard';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { formatPercent } from '@/src/features/walk/utils/formatPercent';
import { getWalkModeLabel } from '@/src/features/walk/utils/walkModeCopy';
import { getRecommendedRouteColor } from '@/src/components/map/routeStyles';
import { colors, spacing, typography } from '@/src/theme/theme';

export function RecommendedRouteCard({ route, walkMode, showHeatMetrics = true }: { route: RouteStats; walkMode: WalkMode; showHeatMetrics?: boolean }) {
  const routeColor = getRecommendedRouteColor(walkMode);
  return (
    <AppCard accessibilityLabel={`${getWalkModeLabel(walkMode)}, ${formatDistance(route.distance_m)}, ${formatDuration(route.duration_min)}${showHeatMetrics ? `, Heat Cost ${route.heat_cost.toFixed(0)}` : ''}`} style={[styles.card, { borderColor: routeColor }]}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={[styles.eyebrow, { color: routeColor }]}>{walkMode === 'fast' ? '카카오 최단 경로' : 'PawSafe 추천'}</Text>
          <Text style={styles.title}>{getWalkModeLabel(walkMode)}</Text>
        </View>
        <View style={[styles.routeDot, { backgroundColor: routeColor }]} />
      </View>
      <View style={styles.metrics}>
        <Metric label="거리" value={formatDistance(route.distance_m)} color={routeColor} />
        <Metric label="예상 시간" value={formatDuration(route.duration_min)} color={routeColor} />
        {showHeatMetrics ? <Metric label="Heat Cost" value={route.heat_cost.toFixed(0)} color={routeColor} /> : null}
      </View>
      {showHeatMetrics ? <Text style={styles.footnote}>그늘 비율 {formatPercent(route.shade_ratio)} · 직사광선 {formatDuration(route.direct_sun_minutes)}</Text> : <Text style={styles.footnote}>카카오 보행 API가 제공한 최단 경로입니다.</Text>}
    </AppCard>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, borderWidth: 2, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleWrap: { gap: 2 }, eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' }, title: { ...typography.subheading, color: colors.text },
  routeDot: { width: 14, height: 14, borderRadius: 7 },
  metrics: { flexDirection: 'row', gap: spacing.sm }, metric: { flex: 1, gap: 2 }, metricLabel: { ...typography.caption, color: colors.mutedText }, metricValue: { ...typography.body, color: colors.greenStrong, fontWeight: '700' },
  footnote: { ...typography.caption, color: colors.mutedText },
});
