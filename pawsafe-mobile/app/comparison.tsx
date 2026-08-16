import { useCallback } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { PawSafeMap } from '@/src/components/map/PawSafeMap';
import { DemoNotice } from '@/src/features/walk/components/DemoNotice';
import { RelativeHeatNotice } from '@/src/features/walk/components/RelativeHeatNotice';
import { ResultHeadline } from '@/src/features/walk/components/ResultHeadline';
import { RouteSummaryCard } from '@/src/features/walk/components/RouteSummaryCard';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';
import { getWalkModeLabel } from '@/src/features/walk/utils/walkModeCopy';

export default function ComparisonScreen() {
  const { state, dispatch } = useWalkFlow();
  const resultState = state.status === 'comparison' || state.status === 'segmentReview' ? state : null;
  const walkModeForAnnouncement = resultState?.request.walk_mode ?? null;
  useFocusEffect(useCallback(() => {
    AccessibilityInfo.announceForAccessibility(`일반 최단 경로와 ${walkModeForAnnouncement ? getWalkModeLabel(walkModeForAnnouncement) : '산책길'} 비교 화면`);
    if (state.status === 'segmentReview') dispatch({ type: 'SHOW_COMPARISON' });
  }, [dispatch, state.status, walkModeForAnnouncement]));
  if (!resultState) return <ScreenContainer style={styles.missing}><Text style={styles.missingText}>비교할 경로 결과가 없습니다.</Text><AppButton onPress={() => { dispatch({ type: 'RESET' }); router.replace('/'); }}>조건 입력으로 이동</AppButton></ScreenContainer>;
  const { request, result } = resultState;
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <ResultHeadline result={result} />
        <PawSafeMap origin={request.origin} destination={request.destination} shortest={result.shortest} pawsafe={result.pawsafe} selectedRoute={resultState.selectedRoute} walkMode="cool" showRouteLegend />
        <View accessibilityRole="radiogroup" style={styles.routeCards}>
          <RouteSummaryCard route={result.shortest} tone="shortest" selected={resultState.selectedRoute === 'shortest'} onPress={() => dispatch({ type: 'SELECT_ROUTE', route: 'shortest' })} />
          <RouteSummaryCard route={result.pawsafe} tone="pawsafe" selected={resultState.selectedRoute === 'pawsafe'} onPress={() => dispatch({ type: 'SELECT_ROUTE', route: 'pawsafe' })} />
        </View>
        <Text style={styles.explanation}>{result.comparison.distance_delta_m > 0 ? `PawSafe 추천은 일반 경로보다 ${Math.round(result.comparison.distance_delta_m)}m 더 걷지만, 현재 기상환경에서 뜨거운 노면 노출을 줄이는 경로예요.` : '현재 기상환경에서 두 경로의 거리와 열노출을 비교했어요.'}</Text>
        {result.is_demo || result.analysis_source === 'graph' ? <DemoNotice analysisSource={result.analysis_source} /> : null}
        <RelativeHeatNotice />
        <Text style={styles.version}>그래프 {result.graph_version} · {result.data_valid_at ? `데이터 ${new Date(result.data_valid_at).toLocaleString('ko-KR')}` : 'MVP 예시 시나리오'}</Text>
        <View style={styles.actions}>
          <AppButton testID="walking-direction-button" onPress={() => router.push('/live')}>산책길 보기</AppButton>
          <AppButton testID="restart-button" variant="secondary" onPress={() => { dispatch({ type: 'RESET' }); router.dismissAll(); router.replace('/'); }}>다른 산책길 찾아보기</AppButton>
          <AppButton variant="quiet" onPress={() => { if (state.status === 'comparison') dispatch({ type: 'SHOW_SEGMENTS' }); router.push('/segments'); }}>구간별 열환경 자세히 보기</AppButton>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, routeCards: { flexDirection: 'row', gap: 0, alignItems: 'stretch' }, actions: { gap: spacing.sm },
  explanation: { ...typography.caption, color: colors.mutedText, lineHeight: 20 },
  version: { ...typography.caption, color: colors.mutedText, textAlign: 'center' }, missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }, missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});
