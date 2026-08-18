import { useCallback, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { PawSafeMap } from '@/src/components/map/PawSafeMap';
import { FastRouteResultCard } from '@/src/features/walk/components/FastRouteResultCard';
import { HeatRiskDecisionModal } from '@/src/features/walk/components/HeatRiskDecisionModal';
import { HeatRiskWarning } from '@/src/features/walk/components/HeatRiskWarning';
import { ResultHeadline } from '@/src/features/walk/components/ResultHeadline';
import { RouteSummaryCard } from '@/src/features/walk/components/RouteSummaryCard';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';
import { getWalkModeLabel } from '@/src/features/walk/utils/walkModeCopy';

export default function ComparisonScreen() {
  const { state, dispatch } = useWalkFlow();
  const [acknowledgedHeatRouteIds, setAcknowledgedHeatRouteIds] = useState<string[]>([]);
  const resultState = state.status === 'comparison' || state.status === 'segmentReview' ? state : null;
  const walkModeForAnnouncement = resultState?.request.walk_mode ?? null;
  useFocusEffect(useCallback(() => {
    AccessibilityInfo.announceForAccessibility(
      walkModeForAnnouncement === 'fast'
        ? '빠른 산책길 결과 화면'
        : `일반 최단 경로와 ${walkModeForAnnouncement ? getWalkModeLabel(walkModeForAnnouncement) : '산책길'} 비교 화면`,
    );
    if (state.status === 'segmentReview') dispatch({ type: 'SHOW_COMPARISON' });
  }, [dispatch, state.status, walkModeForAnnouncement]));
  if (!resultState) return <ScreenContainer style={styles.missing}><Text style={styles.missingText}>비교할 경로 결과가 없습니다.</Text><AppButton onPress={() => { dispatch({ type: 'RESET' }); router.replace('/'); }}>조건 입력으로 이동</AppButton></ScreenContainer>;
  const { request, result } = resultState;
  const selectedRouteForDecision = request.walk_mode === 'fast' || resultState.selectedRoute === 'shortest' ? result.shortest : result.pawsafe;
  const heatRiskDecision = (
    <HeatRiskDecisionModal
      safety={selectedRouteForDecision.safety}
      visible={!acknowledgedHeatRouteIds.includes(selectedRouteForDecision.route_id)}
      onContinue={() => setAcknowledgedHeatRouteIds((routeIds) => [...routeIds, selectedRouteForDecision.route_id])}
      onCancelWalk={() => { dispatch({ type: 'RESET' }); router.dismissAll(); router.replace('/'); }}
    />
  );
  if (request.walk_mode === 'fast') {
    return (
      <ScreenContainer>
        {heatRiskDecision}
        <ScrollView contentContainerStyle={styles.content}>
          <View accessible accessibilityRole="header" style={styles.fastHeader}>
            <Text style={styles.fastLabel}>온:길 빠른 경로</Text>
            <Text style={styles.fastHeadline}>가장 빠른 산책길을{`\n`}찾았어요.</Text>
            <Text style={styles.fastDescription}>온:길 보행로 그래프에서 거리와 예상 시간이 가장 짧은 길이에요.</Text>
          </View>
          <PawSafeMap origin={request.origin} destination={request.destination} shortest={result.shortest} selectedRoute="shortest" walkMode="fast" showRouteLegend={false} />
          <FastRouteResultCard route={result.shortest} />
          <HeatRiskWarning safety={result.shortest.safety} />
          <View style={styles.actions}>
            <AppButton testID="walking-direction-button" onPress={() => router.push('/live')}>산책길 안내</AppButton>
            <AppButton testID="restart-button" variant="secondary" onPress={() => { dispatch({ type: 'RESET' }); router.dismissAll(); router.replace('/'); }}>다른 산책길 찾아보기</AppButton>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }
  return (
    <ScreenContainer>
      {heatRiskDecision}
      <ScrollView contentContainerStyle={styles.content}>
        <ResultHeadline result={result} />
        <PawSafeMap origin={request.origin} destination={request.destination} shortest={result.shortest} pawsafe={result.pawsafe} selectedRoute={resultState.selectedRoute} walkMode="cool" showRouteLegend />
        <View accessibilityRole="radiogroup" style={styles.routeCards}>
          <RouteSummaryCard route={result.shortest} tone="shortest" selected={resultState.selectedRoute === 'shortest'} onPress={() => dispatch({ type: 'SELECT_ROUTE', route: 'shortest' })} />
          <RouteSummaryCard route={result.pawsafe} tone="pawsafe" selected={resultState.selectedRoute === 'pawsafe'} onPress={() => dispatch({ type: 'SELECT_ROUTE', route: 'pawsafe' })} />
        </View>
        <HeatRiskWarning safety={resultState.selectedRoute === 'shortest' ? result.shortest.safety : result.pawsafe.safety} />
        <Text style={styles.explanation}>{result.comparison.distance_delta_m > 0 ? `뜨거운 노면과 직사광선 노출이 상대적으로 적은 길이에요. 일반 경로보다 ${Math.round(result.comparison.distance_delta_m)}m 더 걸어도 우리 강아지가 걷기 좋은 경로를 추천했어요.` : '현재 기상환경에서 거리와 노면 열노출을 함께 비교해 우리 강아지가 걷기 좋은 길을 추천했어요.'}</Text>
        <View style={styles.actions}>
          <AppButton testID="walking-direction-button" onPress={() => router.push('/live')}>산책길 안내</AppButton>
          <AppButton testID="restart-button" variant="secondary" onPress={() => { dispatch({ type: 'RESET' }); router.dismissAll(); router.replace('/'); }}>다른 산책길 찾아보기</AppButton>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, routeCards: { flexDirection: 'row', gap: 0, alignItems: 'stretch' }, actions: { gap: spacing.sm },
  fastHeader: { gap: spacing.xs },
  fastLabel: { alignSelf: 'flex-start', ...typography.caption, color: colors.white, backgroundColor: colors.orange, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 3, fontWeight: '800', fontSize: 10 },
  fastHeadline: { ...typography.heading, color: colors.text, fontSize: 22, lineHeight: 27 },
  fastDescription: { ...typography.caption, color: colors.mutedText },
  explanation: { ...typography.caption, color: colors.mutedText, lineHeight: 20 },
  missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }, missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});
