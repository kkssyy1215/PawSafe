import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { router } from 'expo-router';
import { AppError } from '@/src/api/errors';
import { ErrorState } from '@/src/components/common/ErrorState';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { useWalkFlow } from '@/src/state/WalkFlowContext';

export default function ErrorScreen() {
  const { state, dispatch } = useWalkFlow();
  const error = state.status === 'error' ? state.error : new AppError('INTERNAL_ERROR', 'Missing error');
  useEffect(() => { AccessibilityInfo.announceForAccessibility('경로 분석 오류 화면'); }, []);
  const reset = () => { dispatch({ type: 'RESET' }); router.dismissAll(); router.replace('/'); };
  const retry = state.status === 'error' && state.request && (state.error.retryable || state.error.code === 'ANALYSIS_TIMEOUT')
    ? () => { dispatch({ type: 'RETRY' }); router.replace('/analyzing'); } : undefined;
  return <ScreenContainer><ErrorState error={error} onRetry={retry} onReset={reset} /></ScreenContainer>;
}
