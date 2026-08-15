import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { WalkMode } from '@/src/api/contracts';
import { getWalkModeLabel } from '@/src/features/walk/utils/walkModeCopy';
import { colors, spacing, typography } from '@/src/theme/theme';

type AnalysisStatusProps = {
  isMock: boolean;
  walkMode: WalkMode;
};

type AnalysisStep = {
  label: string;
  done?: boolean;
  active?: boolean;
};

const coolSteps: AnalysisStep[] = [
  { label: '포장재 정보 결합', done: true },
  { label: '기상정보 분석', done: true },
  { label: '일사량 분석', active: true },
  { label: '직사광선 누적 노출 분석' },
  { label: '건물 그림자 분석' },
];

const fastSteps: AnalysisStep[] = [
  { label: '출발지·목적지 확인', done: true },
  { label: '카카오 보행 API 요청', active: true },
  { label: '최단 경로 표시' },
];

/**
 * The analysis screen intentionally has two different stories:
 * - fast: Kakao's walking shortest path is being searched;
 * - cool: the heat/shade pipeline is comparing candidate paths.
 *
 * The animated scan and moving route marker make it clear that the map is
 * still working, rather than a frozen placeholder. Reduce Motion disables
 * those effects while keeping the status information visible.
 */
export function AnalysisStatus({ isMock, walkMode }: AnalysisStatusProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const scanProgress = useRef(new Animated.Value(0)).current;
  const markerProgress = useRef(new Animated.Value(0)).current;
  const routeColor = walkMode === 'fast' ? colors.fastRoute : colors.coolRoute;
  const modeLabel = getWalkModeLabel(walkMode);
  const isFast = walkMode === 'fast';

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      scanProgress.stopAnimation();
      markerProgress.stopAnimation();
      return;
    }
    const scan = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(180),
        Animated.timing(scanProgress, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const marker = Animated.loop(
      Animated.sequence([
        Animated.timing(markerProgress, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(markerProgress, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    scan.start();
    marker.start();
    return () => {
      scan.stop();
      marker.stop();
    };
  }, [markerProgress, reduceMotion, scanProgress]);

  const scanTranslateX = scanProgress.interpolate({ inputRange: [0, 1], outputRange: [-80, 390] });
  const markerScale = markerProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });
  const markerTranslateX = markerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, isFast ? 230 : 18] });
  const markerTranslateY = markerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, isFast ? -118 : 0] });

  return (
    <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{isFast ? '빠른 산책길을 찾고 있어요' : '시원하게 걸을 수 있는 길을 찾고 있어요'}</Text>
          <Text style={styles.description}>
            {isFast ? '카카오 보행 API에서 최단 경로를 불러오고 있어요.' : '노면온도와 그늘 정보를 비교해 발바닥 부담이 적은 길을 찾고 있어요.'}
          </Text>
        </View>
        <View style={[styles.modeBadge, { borderColor: routeColor, backgroundColor: isFast ? '#F1ECFF' : '#E7FBEA' }]}>
          <View style={[styles.modeDot, { backgroundColor: routeColor }]} />
          <Text style={[styles.modeText, { color: routeColor }]}>{modeLabel}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progress, { width: isFast ? '58%' : '66%', backgroundColor: routeColor }]} />
      </View>

      <View style={styles.map} accessibilityLabel={`${modeLabel} 경로를 찾는 중인 지도`}>
        {isFast ? <>
          <View style={[styles.fastRoad, styles.fastRoadOne]} />
          <View style={[styles.fastRoad, styles.fastRoadTwo]} />
          <View style={[styles.fastRoute, styles.fastRouteOne, { backgroundColor: routeColor }]} />
          <View style={[styles.fastRoute, styles.fastRouteTwo, { backgroundColor: routeColor }]} />
          <View style={[styles.endpoint, styles.fastStart, { borderColor: routeColor }]}><Text style={styles.endpointText}>출발</Text></View>
          <View style={[styles.endpoint, styles.fastEnd, { borderColor: routeColor }]}><Text style={styles.endpointText}>도착</Text></View>
        </> : <>
          <View style={[styles.block, styles.blockOne]} />
          <View style={[styles.block, styles.blockTwo]} />
          <View style={[styles.block, styles.blockThree]} />
          <View style={[styles.routeA, { backgroundColor: routeColor }]} />
          <View style={[styles.routeB, { backgroundColor: routeColor }]} />
          <View style={[styles.routeC, { backgroundColor: routeColor }]} />
          {!reduceMotion ? <Animated.View pointerEvents="none" style={[styles.scan, { backgroundColor: routeColor, transform: [{ translateX: scanTranslateX }] }]} /> : null}
        </>}
        <Animated.View style={[styles.routeDot, isFast && styles.fastRouteDot, { backgroundColor: routeColor, transform: [{ translateX: markerTranslateX }, { translateY: markerTranslateY }, { scale: markerScale }] }]} />
        <View style={[styles.mapCaption, { borderColor: routeColor }]}>
          <View style={[styles.mapCaptionDot, { backgroundColor: routeColor }]} />
          <Text style={styles.mapCaptionText}>{isFast ? '카카오 최단 경로 불러오는 중' : '그늘·노면온도 비교 중'}</Text>
        </View>
      </View>

      <View style={styles.steps}>
        {(isFast ? fastSteps : coolSteps).map((step) => <Step key={step.label} {...step} routeColor={routeColor} />)}
      </View>

      <View style={[styles.message, { borderColor: routeColor }]}>
        <ActivityIndicator size="small" color={routeColor} />
        <Text style={styles.messageText}>
          {isFast ? '카카오 보행 API에서 빠른 산책길을 찾고 있어요. 잠시만 기다려 주세요.' : isMock ? '뜨거운 노면과 햇빛 노출이 적은 길을 분석하고 있어요. 잠시만 기다려 주세요.' : '선택한 시각의 노면온도와 그늘 데이터를 비교하고 있어요. 잠시만 기다려 주세요.'}
        </Text>
      </View>
    </View>
  );
}

function Step({ label, done, active, routeColor }: AnalysisStep & { routeColor: string }) {
  return (
    <View style={[styles.step, done && styles.doneStep, active && [styles.activeStep, { borderColor: routeColor }]]}>
      <View style={[styles.stepDot, done && { backgroundColor: routeColor }, active && { backgroundColor: routeColor }]} />
      <Text style={[styles.stepText, (done || active) && { color: routeColor, fontWeight: '700' }]}>{done ? '✓ ' : ''}{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.body, color: colors.mutedText },
  modeBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: 5 },
  modeDot: { width: 8, height: 8, borderRadius: 4 },
  modeText: { ...typography.caption, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#DDE2DC' },
  progress: { height: 4, borderRadius: 2 },
  map: { height: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F0F1ED', borderWidth: 1, borderColor: colors.border },
  block: { position: 'absolute', backgroundColor: '#E4E6E1', borderRadius: 6 },
  blockOne: { left: 16, top: 18, width: 110, height: 88 },
  blockTwo: { left: 140, top: 12, width: 112, height: 78 },
  blockThree: { right: 12, top: 34, width: 92, height: 108 },
  routeA: { position: 'absolute', left: 62, top: 58, width: 7, height: 135, borderRadius: 4 },
  routeB: { position: 'absolute', left: 62, top: 190, width: 180, height: 7, borderRadius: 4 },
  routeC: { position: 'absolute', left: 238, top: 90, width: 7, height: 105, borderRadius: 4 },
  routeDot: { position: 'absolute', left: 230, top: 182, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: colors.white },
  fastRouteDot: { left: 52, top: 184 },
  fastRoad: { position: 'absolute', height: 20, borderRadius: 10, backgroundColor: '#E1E4E8' },
  fastRoadOne: { width: 176, left: 48, top: 156, transform: [{ rotate: '-25deg' }] },
  fastRoadTwo: { width: 142, left: 192, top: 104, transform: [{ rotate: '-18deg' }] },
  fastRoute: { position: 'absolute', height: 7, borderRadius: 4 },
  fastRouteOne: { width: 176, left: 48, top: 162, transform: [{ rotate: '-25deg' }] },
  fastRouteTwo: { width: 142, left: 192, top: 110, transform: [{ rotate: '-18deg' }] },
  endpoint: { position: 'absolute', minWidth: 46, borderWidth: 2, borderRadius: 15, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.white, alignItems: 'center' },
  fastStart: { left: 24, top: 190 },
  fastEnd: { right: 18, top: 56 },
  endpointText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  scan: { position: 'absolute', top: 0, bottom: 0, width: 52, opacity: 0.13 },
  mapCaption: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.sm, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.9)' },
  mapCaptionDot: { width: 7, height: 7, borderRadius: 4 },
  mapCaptionText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  doneStep: { borderColor: '#C7E5CB', backgroundColor: colors.greenSoft },
  activeStep: { backgroundColor: colors.surface },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C6CBC6', marginRight: 4 },
  stepText: { ...typography.caption, color: colors.mutedText },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 14, backgroundColor: colors.surface, padding: spacing.md },
  messageText: { ...typography.caption, color: colors.text, flex: 1 },
});
