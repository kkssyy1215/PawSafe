import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { PlaceSearchField } from '@/src/features/walk/components/PlaceSearchField';
import { WalkModeSelector } from '@/src/features/walk/components/WalkModeSelector';
import { savePendingRouteRequest } from '@/src/features/walk/utils/pendingRouteRequest';
import { toApiPlace, validateWalkForm } from '@/src/features/walk/utils/validation';
import { getWalkSearchButtonLabel } from '@/src/features/walk/utils/walkModeCopy';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { spacing } from '@/src/theme/theme';

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
  const pairedDestinationId = form.origin?.id.endsWith('_origin')
    ? `${form.origin.id.slice(0, -'_origin'.length)}_destination`
    : null;
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
            <PlaceSearchField label="출발지" field="origin" selected={form.origin} placeholder="출발지 주소 검색" resultFilter={(place) => place.id.endsWith('_origin')} onSelect={(place) => {
              setValidationError(null);
              dispatch({ type: 'SET_PLACE', field: 'origin', place });
              dispatch({ type: 'SET_PLACE', field: 'destination', place: null });
            }} />
            <PlaceSearchField label="목적지" field="destination" selected={form.destination} placeholder="목적지 또는 근처 공원 검색" resultFilter={(place) => place.id.endsWith('_destination') && (!pairedDestinationId || place.id === pairedDestinationId)} onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'destination', place }); }} />
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
          >{getWalkSearchButtonLabel(form.walkMode)}</AppButton>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  locationSection: { gap: spacing.md },
  modeSection: { gap: spacing.md },
});
