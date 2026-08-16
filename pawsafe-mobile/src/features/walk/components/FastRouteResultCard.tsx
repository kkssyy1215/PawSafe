import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteStats } from '@/src/api/contracts';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { colors, spacing, typography } from '@/src/theme/theme';

export function FastRouteResultCard({ route }: { route: RouteStats }) {
  return (
    <View accessible accessibilityLabel={`카카오맵 빠른 경로, ${formatDistance(route.distance_m)}, ${formatDuration(route.duration_min)}`} style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.icon}><Ionicons name="flash" size={21} color={colors.orange} /></View>
        <View style={styles.copy}><Text style={styles.title}>카카오맵 빠른 경로</Text><Text style={styles.description}>가장 거리가 짧은 보행경로</Text></View>
        <Text style={styles.badge}>FAST</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statLabel}>거리</Text><Text style={styles.statValue}>{formatDistance(route.distance_m)}</Text></View>
        <View style={styles.divider} />
        <View style={styles.stat}><Text style={styles.statLabel}>예상 시간</Text><Text style={styles.statValue}>{formatDuration(route.duration_min)}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#E8D7B6', borderRadius: 16, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft },
  copy: { flex: 1, gap: 2 },
  title: { ...typography.subheading, color: colors.text, fontWeight: '700' },
  description: { ...typography.caption, color: colors.mutedText },
  badge: { ...typography.caption, color: colors.orange, backgroundColor: colors.orangeSoft, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 3, fontSize: 10, fontWeight: '800' },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: 2 }, statLabel: { ...typography.caption, color: colors.mutedText }, statValue: { ...typography.heading, color: colors.text },
  divider: { width: 1, height: 42, marginHorizontal: spacing.lg, backgroundColor: colors.border },
});
