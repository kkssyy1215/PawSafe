import { StyleSheet, Text, View } from 'react-native';
import type { RouteAnalysisResponse } from '@/src/api/contracts';
import { getResultHeadline } from '@/src/features/walk/utils/resultCopy';
import { colors, spacing, typography } from '@/src/theme/theme';

export function ResultHeadline({ result }: { result: RouteAnalysisResponse }) {
  return <View accessible accessibilityRole="header" style={styles.container}><Text style={styles.badge}>PAWSAFE RECOMMENDATION</Text><Text style={styles.label}>안전한 산책길을 찾았어요</Text><Text style={styles.headline}>{getResultHeadline(result)}</Text></View>;
}
const styles = StyleSheet.create({ container: { gap: spacing.xs }, badge: { alignSelf: 'flex-start', ...typography.caption, color: colors.white, backgroundColor: colors.greenStrong, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 3, fontWeight: '800', letterSpacing: 0.2 }, label: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' }, headline: { ...typography.heading, color: colors.text } });
