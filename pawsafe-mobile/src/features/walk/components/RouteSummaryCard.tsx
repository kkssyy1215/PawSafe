import { StyleSheet, Text, View } from 'react-native';
import type { RouteStats } from '@/src/api/contracts';
import { AppCard } from '@/src/components/common/AppCard';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { formatPercent } from '@/src/features/walk/utils/formatPercent';
import { colors, spacing, typography } from '@/src/theme/theme';

export function RouteSummaryCard({ route, tone }: { route: RouteStats; tone: 'shortest' | 'pawsafe' }) {
  const values = [
    ['총 거리', formatDistance(route.distance_m)], ['예상 시간', formatDuration(route.duration_min)],
    ['Heat Cost', route.heat_cost.toFixed(0)], ['예상 그늘 비율', formatPercent(route.shade_ratio)],
    ['직사광선 노출', formatDuration(route.direct_sun_minutes)],
  ];
  return (
    <AppCard style={[styles.card, tone === 'pawsafe' ? styles.pawsafe : styles.shortest]}>
      <Text style={styles.title}>{tone === 'shortest' ? '카카오맵 최단경로' : 'PawSafe 추천'}</Text>
      {values.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
    </AppCard>
  );
}
const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, gap: spacing.sm }, shortest: { borderTopWidth: 4, borderTopColor: colors.orange }, pawsafe: { borderTopWidth: 4, borderTopColor: colors.greenStrong },
  title: { ...typography.subheading, color: colors.text, marginBottom: spacing.xs }, row: { gap: 1 }, label: { ...typography.caption, color: colors.mutedText }, value: { ...typography.body, color: colors.text, fontWeight: '700' },
});
