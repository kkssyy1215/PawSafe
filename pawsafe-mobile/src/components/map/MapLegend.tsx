import { StyleSheet, Text, View } from 'react-native';
import type { WalkMode } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';
import { getRecommendedRouteColor } from './routeStyles';

export function MapLegend({ showRoutes = true, showSegments = false, walkMode = 'cool' }: { showRoutes?: boolean; showSegments?: boolean; walkMode?: WalkMode }) {
  return (
    <View accessible accessibilityLabel="지도 범례" style={styles.container}>
      {showRoutes ? <><Legend color={colors.routeBaseline} label="일반 최단경로" /><Legend color={getRecommendedRouteColor(walkMode)} label={walkMode === 'fast' ? '일반 최단경로' : '온:길 추천'} /></> : null}
      {showSegments ? <><Legend color={colors.low} label="열노출 낮음" dot /><Legend color={colors.medium} label="열노출 보통" dot /><Legend color={colors.high} label="열노출 높음" dot /><Legend color={colors.unknown} label="정보 부족" dot /></> : null}
    </View>
  );
}
function Legend({ color, label, dot = false }: { color: string; label: string; dot?: boolean }) {
  return <View style={styles.item}><View style={[dot ? styles.dot : styles.line, { backgroundColor: color }]} /><Text style={styles.label}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.sm }, item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  line: { width: 22, height: 4, borderRadius: 2 }, dot: { width: 9, height: 9, borderRadius: 5 }, label: { ...typography.caption, color: colors.text },
});
