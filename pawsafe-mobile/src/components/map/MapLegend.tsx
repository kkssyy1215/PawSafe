import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export function MapLegend({ showRoutes = true, showSegments = false }: { showRoutes?: boolean; showSegments?: boolean }) {
  return (
    <View accessible accessibilityLabel="지도 범례" style={styles.container}>
      {showRoutes ? <><Legend color={colors.orange} label="일반 경로" /><Legend color={colors.greenStrong} label="PawSafe 경로" /></> : null}
      {showSegments ? <><Legend color={colors.low} label="열노출 낮음" /><Legend color={colors.medium} label="열노출 보통" /><Legend color={colors.high} label="열노출 높음" /><Legend color={colors.unknown} label="정보 부족" /></> : null}
    </View>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.item}><View style={[styles.line, { backgroundColor: color }]} /><Text style={styles.label}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.sm }, item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  line: { width: 22, height: 4, borderRadius: 2 }, label: { ...typography.caption, color: colors.text },
});
