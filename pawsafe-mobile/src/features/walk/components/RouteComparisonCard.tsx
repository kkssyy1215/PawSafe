import { StyleSheet, Text, View } from 'react-native';
import type { RouteComparison } from '@/src/api/contracts';
import { AppCard } from '@/src/components/common/AppCard';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatPercentagePoint } from '@/src/features/walk/utils/formatPercent';
import { colors, spacing, typography } from '@/src/theme/theme';

const signed = (value: number, unit = '') => `${value > 0 ? '+' : ''}${Math.round(value)}${unit}`;
export function RouteComparisonCard({ comparison }: { comparison: RouteComparison }) {
  const rows = [
    ['거리 증가량', comparison.distance_delta_m > 0 ? `+${formatDistance(comparison.distance_delta_m)}` : formatDistance(comparison.distance_delta_m)],
    ['시간 증가량', signed(comparison.duration_delta_min, '분')],
    ['Heat Cost 차이', signed(comparison.heat_cost_delta)],
    ['Heat Cost 감소율', comparison.heat_reduction_percent == null ? '정보 없음' : `${comparison.heat_reduction_percent.toFixed(1).replace('.0', '')}%`],
    ['그늘 비율 차이', formatPercentagePoint(comparison.shade_ratio_delta_percentage_point)],
    ['직사광선 시간 차이', comparison.direct_sun_minutes_delta == null ? '정보 없음' : signed(comparison.direct_sun_minutes_delta, '분')],
  ];
  return (
    <AppCard style={styles.card}><Text style={styles.title}>경로 차이</Text>{rows.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</AppCard>
  );
}
const styles = StyleSheet.create({
  card: { gap: spacing.sm }, title: { ...typography.subheading, color: colors.text, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, label: { ...typography.body, color: colors.mutedText }, value: { ...typography.body, color: colors.text, fontWeight: '700' },
});
