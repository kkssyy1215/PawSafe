import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, AppState, Platform, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { AppStateStatus } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { AnalysisStatus } from '@/src/features/walk/components/AnalysisStatus';
import { FastRouteStatus } from '@/src/features/walk/components/FastRouteStatus';
import { useRouteAnalysis } from '@/src/features/walk/hooks/useRouteAnalysis';
import { clearPendingRouteRequest, loadPendingRouteRequest } from '@/src/features/walk/utils/pendingRouteRequest';
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
        const [result] = await Promise.all([
          analyze(request),
          new Promise<void>((resolve) => setTimeout(resolve, request.walk_mode === 'fast' ? 1_300 : 3_200)),
        ]);
        if (!active) return;
        dispatch({ type: 'SUBMIT_SUCCESS', result });
        clearPendingRouteRequest();
        router.replace('/comparison');
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {walkMode === 'fast' ? <FastRouteStatus /> : <AnalysisStatus />}
        <AppButton variant="quiet" onPress={() => { cancel(); clearPendingRouteRequest(); router.back(); }}>검색 취소</AppButton>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ container: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg } });
