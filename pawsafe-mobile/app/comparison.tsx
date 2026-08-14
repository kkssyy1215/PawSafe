import { useCallback } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, type RelativePathString } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { PawSafeMap } from '@/src/components/map/PawSafeMap';
import { DemoNotice } from '@/src/features/walk/components/DemoNotice';
import { RelativeHeatNotice } from '@/src/features/walk/components/RelativeHeatNotice';
import { ResultHeadline } from '@/src/features/walk/components/ResultHeadline';
import { RouteComparisonCard } from '@/src/features/walk/components/RouteComparisonCard';
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
        {result.is_demo || result.analysis_source === 'graph' ? <DemoNotice analysisSource={result.analysis_source} /> : null}
        {result.comparison.same_route ? <Notice tone="warning">두 경로의 선이 지도에서 겹칩니다.</Notice> : null}
        <PawSafeMap origin={request.origin} destination={request.destination} shortest={result.shortest} pawsafe={result.pawsafe} walkMode={request.walk_mode} showRouteLegend />
        <View style={styles.routeCards}><RouteSummaryCard route={result.shortest} tone="shortest" /><RouteSummaryCard route={result.pawsafe} tone="pawsafe" walkMode={request.walk_mode} /></View>
        <RouteComparisonCard comparison={result.comparison} />
        <RelativeHeatNotice />
        <Text style={styles.version}>그래프 {result.graph_version} · {result.data_valid_at ? `데이터 ${new Date(result.data_valid_at).toLocaleString('ko-KR')}` : 'MVP 예시 시나리오'}</Text>
        <View style={styles.actions}>
          <AppButton variant="secondary" onPress={() => { if (state.status === 'comparison') dispatch({ type: 'SHOW_SEGMENTS' }); router.back(); }}>구간 다시 보기</AppButton>
          <AppButton testID="restart-button" onPress={() => { dispatch({ type: 'RESET' }); router.dismissAll(); router.replace('/'); }}>다른 조건으로 검색</AppButton>
          <AppButton onPress={() => router.push('/live' as RelativePathString)}>산책 시작</AppButton>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, routeCards: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' }, actions: { gap: spacing.sm },
  version: { ...typography.caption, color: colors.mutedText, textAlign: 'center' }, missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }, missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});
