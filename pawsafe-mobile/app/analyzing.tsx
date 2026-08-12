import { useEffect, useRef } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { AppStateStatus } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { AnalysisStatus } from '@/src/features/walk/components/AnalysisStatus';
import { useRouteAnalysis } from '@/src/features/walk/hooks/useRouteAnalysis';
import { env } from '@/src/config/env';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { spacing } from '@/src/theme/spacing';

export default function AnalyzingScreen() {
  const { state, dispatch } = useWalkFlow();
  const { analyze, cancel } = useRouteAnalysis();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const mounted = useRef(true);
  const running = useRef(false);
  const request = state.status === 'submitting' ? state.request : null;

  useEffect(() => { AccessibilityInfo.announceForAccessibility(env.analysisMode === 'mock' ? 'MVP 예시 경로를 준비하고 있어요' : '선택한 조건으로 경로를 분석하고 있어요'); }, []);
  useEffect(() => {
    mounted.current = true;
    if (!request) return;
    const run = async () => {
      if (running.current || appState.current !== 'active') return;
      running.current = true;
      try {
        const result = await analyze(request);
        if (!mounted.current) return;
        dispatch({ type: 'SUBMIT_SUCCESS', result });
        router.replace('/segments');
      } catch (error) {
        if (!mounted.current || (error instanceof Error && error.name === 'AppError' && 'code' in error && error.code === 'CANCELLED')) return;
        dispatch({ type: 'FAIL', error: error as import('@/src/api/errors').AppError });
        router.replace('/error');
      } finally { running.current = false; }
    };
    void run();
    const subscription = AppState.addEventListener('change', (next) => {
      const wasActive = appState.current === 'active';
      appState.current = next;
      if (wasActive && next !== 'active') { running.current = false; cancel(); }
      if (next === 'active') void run();
    });
    return () => { mounted.current = false; subscription.remove(); cancel(); };
  }, [analyze, cancel, dispatch, request]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AnalysisStatus isMock={env.analysisMode === 'mock'} />
        <AppButton variant="quiet" onPress={() => { cancel(); router.back(); }}>이전 화면</AppButton>
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl } });
