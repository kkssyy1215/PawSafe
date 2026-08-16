import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

const steps = [
  { label: '포장재 정보 결합', description: '보행로의 포장재 특성을 확인하고 있어요.' },
  { label: '기상정보 분석', description: '모델 서버가 AWS·ASOS 관측자료를 분석하고 있어요.' },
  { label: '일사량 분석', description: '최근 햇빛에 노출된 정도를 계산하고 있어요.' },
  { label: '직사광선 누적 노출 분석', description: '직사광선에 노출된 시간을 분석하고 있어요.' },
  { label: '건물 그림자 분석', description: '시간대별 건물 그림자와 시원한 경로를 계산하고 있어요.' },
];

export function AnalysisStatus({ isMock }: { isMock: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const markerProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const id = setInterval(() => setActiveStep((value) => Math.min(value + 1, steps.length - 1)), 560);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(markerProgress, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(markerProgress, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [markerProgress, reduceMotion]);

  const markerTranslateX = markerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 142] });
  const markerTranslateY = markerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 76] });
  const progress = `${Math.round(((activeStep + 1) / steps.length) * 100)}%` as `${number}%`;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.headingCopy}>
        <Text style={styles.title}>우리 강아지가 걷기 좋은 길을{`\n`}찾고 있어요</Text>
        <Text style={styles.description}>현재 날씨를 반영해 두 산책길을 비교하고 있어요.</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progress, { width: progress }]} /></View>

      <View style={styles.map} accessibilityLabel="실시간 열환경 분석 중인 보행로 지도">
        <View style={[styles.block, styles.blockOne]} /><View style={[styles.block, styles.blockTwo]} />
        <View style={[styles.block, styles.blockThree]} /><View style={[styles.block, styles.blockFour]} />
        <View style={styles.routeVertical} /><View style={styles.routeHorizontal} />
        <Animated.View style={[styles.routeDot, { transform: [{ translateX: markerTranslateX }, { translateY: markerTranslateY }] }]} />
      </View>

      <Text style={styles.stepCaption}>실시간 분석 데이터 결합 중</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return <View key={step.label} style={[styles.step, (done || active) && styles.activeStep]}>
            <View style={[styles.stepDot, (done || active) && styles.activeDot]} />
            <Text style={[styles.stepText, (done || active) && styles.activeText]}>{done ? '✓ ' : ''}{step.label}</Text>
          </View>;
        })}
      </View>
      <View style={styles.message}>
        <ActivityIndicator size="small" color={colors.greenStrong} />
        <Text style={styles.messageText}>{steps[activeStep].description}{isMock ? ' 시연용 분석 데이터를 사용 중입니다.' : ''}{`\n`}뜨거운 노면과 햇빛 노출이 적은 길을 찾고 있어요. 잠시만 기다려 주세요.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.mutedText },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#DDE2DC' },
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.greenStrong },
  map: { height: 236, overflow: 'hidden', backgroundColor: '#F2F3EF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ECEEEA' },
  block: { position: 'absolute', backgroundColor: '#E8E9E5', borderRadius: 4 },
  blockOne: { left: 8, top: 12, width: 102, height: 78 }, blockTwo: { left: 122, top: 12, width: 102, height: 78 },
  blockThree: { left: 8, bottom: 12, width: 102, height: 94 }, blockFour: { left: 122, bottom: 12, width: 102, height: 94 },
  routeVertical: { position: 'absolute', left: 106, top: 18, width: 4, height: 102, backgroundColor: colors.greenStrong, borderRadius: 2 },
  routeHorizontal: { position: 'absolute', left: 106, top: 116, width: 154, height: 4, backgroundColor: colors.greenStrong, borderRadius: 2 },
  routeDot: { position: 'absolute', left: 100, top: 110, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.greenStrong, borderWidth: 3, borderColor: colors.white },
  stepCaption: { ...typography.caption, color: colors.mutedText },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  activeStep: { borderColor: '#BFDCC4', backgroundColor: colors.greenSoft },
  stepDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C6CBC6', marginRight: 4 },
  activeDot: { backgroundColor: colors.greenStrong },
  stepText: { ...typography.caption, color: colors.mutedText, fontSize: 11 },
  activeText: { color: colors.greenStrong, fontWeight: '700' },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: spacing.md },
  messageText: { ...typography.caption, color: colors.text, flex: 1 },
});
