import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { RegisteredPlacePicker } from '@/src/features/walk/components/RegisteredPlacePicker';
import { WalkModeSelector } from '@/src/features/walk/components/WalkModeSelector';
import { savePendingRouteRequest } from '@/src/features/walk/utils/pendingRouteRequest';
import { toApiPlace, validateWalkForm } from '@/src/features/walk/utils/validation';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function InputScreen() {
  const { state, dispatch } = useWalkFlow();
  const [validationError, setValidationError] = useState<string | null>(null);
  const stateStatus = useRef(state.status);
  stateStatus.current = state.status;
  useFocusEffect(useCallback(() => {
    // Reset only when this screen regains focus. Depending directly on
    // state.status reruns the focus effect during submit and clears the request
    // before the analyzing screen can send it to the API.
    if (stateStatus.current !== 'input') dispatch({ type: 'RESET' });
  }, [dispatch]));
  useEffect(() => { AccessibilityInfo.announceForAccessibility('산책 조건 입력 화면'); }, []);

  if (state.status !== 'input') return <ScreenContainer><View /></ScreenContainer>;
  const { form } = state;
  const submit = () => {
    const issue = validateWalkForm(form);
    if (issue) { setValidationError(issue); AccessibilityInfo.announceForAccessibility(issue); return; }
    if (!form.origin || !form.destination) return;
    const request = {
      // Search results also carry client-only coverage metadata. Explicitly build
      // the API location objects because FastAPI forbids unknown request fields.
      origin: toApiPlace(form.origin),
      destination: toApiPlace(form.destination),
      walk_mode: form.walkMode,
    };
    savePendingRouteRequest(request);
    dispatch({ type: 'BEGIN_SUBMIT', request });
    router.push({ pathname: '/analyzing', params: { walkMode: request.walk_mode } });
  };
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow="PawSafe" brandTagline="오늘도 발바닥까지 안전하게" />
          <View style={styles.locationSection}>
            <RegisteredPlacePicker label="출발지" field="origin" selected={form.origin} onSelect={(place) => {
              setValidationError(null);
              dispatch({ type: 'SET_PLACE', field: 'origin', place });
              dispatch({ type: 'SET_PLACE', field: 'destination', place: null });
            }} />
            <RegisteredPlacePicker label="목적지" field="destination" selected={form.destination} pairedWith={form.origin} onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'destination', place }); }} />
          </View>
          <View style={styles.modeSection}>
            <WalkModeSelector value={form.walkMode} onChange={(value) => dispatch({ type: 'SET_WALK_MODE', value })} />
          </View>
          {validationError ? <Notice tone="error" accessibilityLiveRegion="assertive">{validationError}</Notice> : null}
          <AppButton
            testID="analyze-button"
            disabled={!form.origin || !form.destination}
            accessibilityHint="선택한 조건으로 경로 비교를 요청합니다."
            onPress={submit}
          >안전한 산책길 찾기</AppButton>
          <Text style={styles.liveNote}>요청 시점의 최신 기상정보를 반영해 두 경로를 비교해요.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  locationSection: { gap: spacing.md },
  modeSection: { gap: spacing.md },
  liveNote: { ...typography.caption, color: colors.mutedText, textAlign: 'center' },
});
