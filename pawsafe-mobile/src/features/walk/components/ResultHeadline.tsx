import { StyleSheet, Text, View } from 'react-native';
import type { RouteAnalysisResponse } from '@/src/api/contracts';
import { getResultHeadline } from '@/src/features/walk/utils/resultCopy';
import { colors, spacing, typography } from '@/src/theme/theme';

export function ResultHeadline({ result }: { result: RouteAnalysisResponse }) {
  return <View accessible accessibilityRole="header" style={styles.container}><Text style={styles.label}>온:길 추천 경로</Text><Text style={styles.headline}>{getResultHeadline(result)}</Text></View>;
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { alignSelf: 'flex-start', ...typography.caption, color: colors.white, backgroundColor: colors.greenStrong, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 3, fontWeight: '800', fontSize: 10 },
  headline: { ...typography.heading, color: colors.text, fontSize: 22, lineHeight: 27 },
});
