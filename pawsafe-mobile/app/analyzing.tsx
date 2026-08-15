import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, AppState, Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { AppStateStatus } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { AnalysisStatus } from '@/src/features/walk/components/AnalysisStatus';
import { useRouteAnalysis } from '@/src/features/walk/hooks/useRouteAnalysis';
import { clearPendingRouteRequest, loadPendingRouteRequest } from '@/src/features/walk/utils/pendingRouteRequest';
import { env } from '@/src/config/env';
import { getMockRouteScenario } from '@/src/mocks/routeScenarios';
import { pipelineMockRouteDestination, pipelineMockRouteOrigin } from '@/src/mocks/places';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { spacing } from '@/src/theme/spacing';

export default function AnalyzingScreen() {
  const { state, dispatch } = useWalkFlow();
  const { analyze, cancel } = useRouteAnalysis();
  const params = useLocalSearchParams<{ walkMode?: string }>();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const recoveredRequest = useMemo(loadPendingRouteRequest, []);
  const request = state.status === 'submitting' ? state.request : null;
  const walkMode = request?.walk_mode ?? recoveredRequest?.walk_mode ?? (params.walkMode === 'fast' ? 'fast' : 'cool');
  const showTemporaryResult = () => {
    // Keep the preview usable even if a web refresh lost the in-memory form
    // state. The real model/API path is untouched; this is only a local UI
    // escape hatch for reviewing the screens after analysis.
    const previewRequest = request ?? {
      origin: pipelineMockRouteOrigin,
      destination: pipelineMockRouteDestination,
      departure_at: new Date().toISOString(),
      walk_mode: 'cool' as const,
    };
    cancel();
    if (!request) dispatch({ type: 'BEGIN_SUBMIT', request: previewRequest });
    dispatch({ type: 'SUBMIT_SUCCESS', result: getMockRouteScenario(previewRequest) });
    clearPendingRouteRequest();
    router.replace('/segments');
  };

  useEffect(() => {
    if (state.status !== 'input') return;
    if (recoveredRequest) {
      dispatch({ type: 'BEGIN_SUBMIT', request: recoveredRequest });
      return;
    }
    router.replace('/');
  }, [dispatch, recoveredRequest, state.status]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      walkMode === 'fast' ? '빠른 산책길을 찾고 있어요' : '시원한 산책길을 찾고 있어요',
    );
  }, [walkMode]);
  useEffect(() => {
    if (!request) return;
    let active = true;
    let running = false;
    const run = async () => {
      // React Native Web can report an `unknown` AppState while the tab is
      // visible. It must not block the deterministic local mock flow; native
      // platforms still wait for an active app before starting a request.
      if (running || (Platform.OS !== 'web' && appState.current !== 'active')) return;
      running = true;
      try {
        const result = await analyze(request);
        if (!active) return;
        dispatch({ type: 'SUBMIT_SUCCESS', result });
        clearPendingRouteRequest();
        router.replace('/segments');
      } catch (error) {
        if (!active || (error instanceof Error && error.name === 'AppError' && 'code' in error && error.code === 'CANCELLED')) return;
        dispatch({ type: 'FAIL', error: error as import('@/src/api/errors').AppError });
        router.replace('/error');
      } finally { running = false; }
    };
    void run();
    const subscription = AppState.addEventListener('change', (next) => {
      const wasActive = appState.current === 'active';
      appState.current = next;
      if (wasActive && next !== 'active') { running = false; cancel(); }
      if (next === 'active') void run();
    });
    return () => { active = false; subscription.remove(); cancel(); };
  }, [analyze, cancel, dispatch, request]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AnalysisStatus isMock={env.analysisMode === 'mock'} walkMode={walkMode} />
        {env.showDemoControls && env.analysisMode === 'mock' ? <AppButton testID="preview-results-button" variant="secondary" onPress={showTemporaryResult}>분석 결과 임시로 보기</AppButton> : null}
        <AppButton variant="quiet" onPress={() => { cancel(); clearPendingRouteRequest(); router.back(); }}>이전 화면</AppButton>
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl } });
