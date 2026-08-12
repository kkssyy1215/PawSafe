import { StyleSheet, Text, View } from 'react-native';
import type { HeatSegment } from '@/src/api/contracts';
import { AppCard } from '@/src/components/common/AppCard';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { formatPercent } from '@/src/features/walk/utils/formatPercent';
import { colors, spacing, typography } from '@/src/theme/theme';

export const heatLevelCopy: Record<HeatSegment['level'], string> = {
  low: '열노출 낮음', medium: '열노출 보통', high: '열노출 높음', unknown: '정보 부족',
};
function validationCopy(value: HeatSegment['validation_status']) {
  if (value === 'validated') return '실측 검증 완료';
  if (value === 'partially_validated') return '일부 실측 검증';
  return '실측 검증 전';
}

export function HeatSegmentCard({ segment, isDemo }: { segment: HeatSegment; isDemo: boolean }) {
  const rows = [
    ['상대 열노출 수준', heatLevelCopy[segment.level]],
    ['Heat Cost', segment.heat_cost == null ? '정보 없음' : segment.heat_cost.toFixed(0)],
    ['예상 그늘 비율', formatPercent(segment.shade_ratio)],
    ['직사광선 노출 시간', formatDuration(segment.direct_sun_minutes)],
    ['포장재', segment.surface_type || '포장재 정보 없음'],
    ['데이터 기준', segment.data_valid_at ? new Date(segment.data_valid_at).toLocaleString('ko-KR') : 'MVP 예시 시나리오'],
    ['검증 상태', validationCopy(segment.validation_status)],
    ['데이터 구분', isDemo ? 'MVP 예시 데이터' : 'API 연결 데이터'],
  ];
  return (
    <AppCard accessible accessibilityLabel={`${segment.display_name}, ${rows.map((row) => row.join(' ')).join(', ')}`} style={styles.card}>
      <Text style={styles.title}>{segment.display_name}</Text>
      <View style={styles.rows}>{rows.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View>
      {segment.confidence != null ? <Text style={styles.footnote}>데이터 신뢰도 {formatPercent(segment.confidence)}</Text> : null}
    </AppCard>
  );
}
const styles = StyleSheet.create({
  card: { gap: spacing.md }, title: { ...typography.subheading, color: colors.text }, rows: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg },
  label: { ...typography.caption, color: colors.mutedText, flex: 1 }, value: { ...typography.caption, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  footnote: { ...typography.caption, color: colors.mutedText },
});
