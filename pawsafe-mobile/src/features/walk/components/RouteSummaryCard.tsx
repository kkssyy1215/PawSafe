import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RouteStats } from '@/src/api/contracts';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { colors, spacing, typography } from '@/src/theme/theme';

interface RouteSummaryCardProps {
  route: RouteStats;
  tone: 'shortest' | 'pawsafe';
  selected: boolean;
  onPress: () => void;
}

export function RouteSummaryCard({ route, tone, selected, onPress }: RouteSummaryCardProps) {
  const isPawSafe = tone === 'pawsafe';
  const isKakao = route.route_source.toLowerCase().includes('kakao');
  const title = isPawSafe ? 'PawSafe 추천' : isKakao ? '카카오맵 최단경로' : '일반 최단경로';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${title}, ${formatDistance(route.distance_m)}, ${formatDuration(route.duration_min)}, Heat Cost ${route.heat_cost.toFixed(0)}`}
      style={({ pressed }) => [styles.card, isPawSafe ? styles.pawsafe : styles.shortest, selected && styles.selected, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, isPawSafe && styles.pawsafeTitle]}>{title}</Text>
        {selected ? <Text style={styles.selectedBadge}>선택</Text> : null}
      </View>
      <Text style={styles.distance}>{formatDistance(route.distance_m)}</Text>
      <Text style={styles.duration}>{formatDuration(route.duration_min)}</Text>
      <View style={styles.heatPill}><Text style={styles.heatText}>Heat Cost {route.heat_cost.toFixed(0)}</Text></View>
      <Text style={[styles.caption, isPawSafe ? styles.coolCaption : styles.hotCaption]}>{isPawSafe ? '조금 더 걸어도 · 열노출 감소' : '거리 우선 · 빠른 이동'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, minHeight: 176, padding: spacing.md, gap: spacing.xs, borderWidth: 1, backgroundColor: colors.surface },
  shortest: { borderColor: '#E8D7B6', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  pawsafe: { borderColor: '#B9DEBF', borderTopRightRadius: 16, borderBottomRightRadius: 16, backgroundColor: '#EFF9F0' },
  selected: { borderWidth: 2, borderColor: colors.greenStrong },
  pressed: { opacity: 0.76 },
  titleRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  title: { ...typography.caption, color: colors.text, fontWeight: '700', fontSize: 11 },
  pawsafeTitle: { color: colors.greenStrong },
  selectedBadge: { ...typography.caption, color: colors.white, backgroundColor: colors.greenStrong, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, fontSize: 9, fontWeight: '800' },
  distance: { ...typography.heading, color: colors.text, fontSize: 22 },
  duration: { ...typography.caption, color: colors.mutedText },
  heatPill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 3, backgroundColor: colors.greenSoft },
  heatText: { ...typography.caption, color: colors.greenStrong, fontWeight: '800', fontSize: 10 },
  caption: { ...typography.caption, fontSize: 10, lineHeight: 15, marginTop: 'auto' },
  coolCaption: { color: colors.greenStrong }, hotCaption: { color: colors.orange },
});
