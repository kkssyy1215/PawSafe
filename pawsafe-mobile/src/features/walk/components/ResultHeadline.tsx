import { StyleSheet, Text, View } from 'react-native';
import type { RouteAnalysisResponse } from '@/src/api/contracts';
import { getResultHeadline } from '@/src/features/walk/utils/resultCopy';
import { colors, spacing, typography } from '@/src/theme/theme';

export function ResultHeadline({ result }: { result: RouteAnalysisResponse }) {
  return <View accessible accessibilityRole="header" style={styles.container}><Text style={styles.label}>경로 비교 결과</Text><Text style={styles.headline}>{getResultHeadline(result)}</Text></View>;
}
const styles = StyleSheet.create({ container: { gap: spacing.xs }, label: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' }, headline: { ...typography.heading, color: colors.text } });
