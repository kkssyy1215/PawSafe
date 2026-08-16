import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export function FastRouteStatus() {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>가장 빠른 산책길을{`\n`}찾고 있어요</Text>
        <Text style={styles.description}>카카오맵에서 보행거리와 예상 시간을 확인하고 있어요.</Text>
      </View>
      <View style={styles.progressTrack}><View style={styles.progress} /></View>
      <View style={styles.map} accessibilityLabel="카카오맵 빠른 보행경로 검색 중">
        <View style={[styles.block, styles.blockOne]} /><View style={[styles.block, styles.blockTwo]} />
        <View style={[styles.block, styles.blockThree]} /><View style={[styles.block, styles.blockFour]} />
        <View style={styles.routeHorizontal} /><View style={styles.routeVertical} />
        <View style={styles.startDot} /><View style={styles.endDot} />
      </View>
      <View style={styles.message}>
        <ActivityIndicator size="small" color={colors.orange} />
        <Text style={styles.messageText}>Kakao 도보 API에서 빠른 경로를 불러오고 있어요.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  heading: { gap: spacing.xs },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.mutedText },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#E2E4E0' },
  progress: { width: '72%', height: 4, borderRadius: 2, backgroundColor: colors.orange },
  map: { height: 236, overflow: 'hidden', backgroundColor: '#F2F3EF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ECEEEA' },
  block: { position: 'absolute', backgroundColor: '#E8E9E5', borderRadius: 4 },
  blockOne: { left: 8, top: 12, width: 102, height: 78 }, blockTwo: { left: 122, top: 12, width: 102, height: 78 },
  blockThree: { left: 8, bottom: 12, width: 102, height: 94 }, blockFour: { left: 122, bottom: 12, width: 102, height: 94 },
  routeHorizontal: { position: 'absolute', left: 44, top: 116, width: 180, height: 4, backgroundColor: colors.orange, borderRadius: 2 },
  routeVertical: { position: 'absolute', left: 220, top: 116, width: 4, height: 76, backgroundColor: colors.orange, borderRadius: 2 },
  startDot: { position: 'absolute', left: 38, top: 110, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.greenStrong, borderWidth: 3, borderColor: colors.white },
  endDot: { position: 'absolute', left: 214, top: 184, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.orange, borderWidth: 3, borderColor: colors.white },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: spacing.md },
  messageText: { ...typography.caption, color: colors.text, flex: 1 },
});
