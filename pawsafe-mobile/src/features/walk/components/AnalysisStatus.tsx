import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export function AnalysisStatus({ isMock }: { isMock: boolean }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <Text style={styles.title}>우리 강아지가 걷기 좋은 길을 찾고 있어요</Text>
      <Text style={styles.description}>{isMock ? '뜨거운 노면과 햇빛 노출이 적은 길을 실시간으로 분석하고 있어요.' : '노면온도와 그늘 정보를 비교하고 있어요.'}</Text>
      <View style={styles.progressTrack}><View style={styles.progress} /></View>
      <View style={styles.map}>
        <View style={[styles.block, styles.blockOne]} /><View style={[styles.block, styles.blockTwo]} /><View style={[styles.block, styles.blockThree]} />
        <View style={styles.routeA} /><View style={styles.routeB} /><View style={styles.routeC} /><View style={styles.routeDot} />
      </View>
      <View style={styles.steps}>
        <Step done label="포장재 정보 결합" /><Step done label="기상정보 분석" /><Step active label="일사량 분석" /><Step label="직사광선 누적 노출 분석" /><Step label="건물 그림자 분석" />
      </View>
      <View style={styles.message}><ActivityIndicator size="small" color={colors.greenStrong} /><Text style={styles.messageText}>뜨거운 노면과 햇빛 노출이 적은 길을 분석하고 있어요. 잠시만 기다려 주세요.</Text></View>
    </View>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return <View style={[styles.step, done && styles.doneStep, active && styles.activeStep]}><View style={[styles.stepDot, done && styles.doneDot, active && styles.activeDot]} /><Text style={[styles.stepText, (done || active) && styles.emphasis]}>{done ? '✓ ' : ''}{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { ...typography.heading, color: colors.text }, description: { ...typography.body, color: colors.mutedText },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#DDE2DC' }, progress: { width: '66%', height: 4, backgroundColor: colors.greenStrong },
  map: { height: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F0F1ED', borderWidth: 1, borderColor: colors.border },
  block: { position: 'absolute', backgroundColor: '#E4E6E1', borderRadius: 6 }, blockOne: { left: 16, top: 18, width: 110, height: 88 }, blockTwo: { left: 140, top: 12, width: 112, height: 78 }, blockThree: { right: 12, top: 34, width: 92, height: 108 },
  routeA: { position: 'absolute', left: 62, top: 58, width: 7, height: 135, borderRadius: 4, backgroundColor: colors.greenStrong }, routeB: { position: 'absolute', left: 62, top: 190, width: 180, height: 7, borderRadius: 4, backgroundColor: colors.greenStrong }, routeC: { position: 'absolute', left: 238, top: 90, width: 7, height: 105, borderRadius: 4, backgroundColor: colors.greenStrong }, routeDot: { position: 'absolute', left: 230, top: 182, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.greenStrong, borderWidth: 3, borderColor: colors.white },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, step: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface }, doneStep: { borderColor: '#C7E5CB', backgroundColor: colors.greenSoft }, activeStep: { borderColor: colors.greenStrong }, stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C6CBC6', marginRight: 4 }, doneDot: { backgroundColor: colors.greenStrong }, activeDot: { backgroundColor: colors.greenStrong }, stepText: { ...typography.caption, color: colors.mutedText }, emphasis: { color: colors.greenStrong, fontWeight: '700' },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: spacing.md }, messageText: { ...typography.caption, color: colors.text, flex: 1 },
});
