import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { useAddressVoiceInput, type AddressField } from '@/src/features/accessibility/useAddressVoiceInput';
import { PlaceSearchField } from '@/src/features/walk/components/PlaceSearchField';
import { WalkModeSelector } from '@/src/features/walk/components/WalkModeSelector';
import { savePendingRouteRequest } from '@/src/features/walk/utils/pendingRouteRequest';
import { toApiPlace, validateWalkForm } from '@/src/features/walk/utils/validation';
import { getWalkSearchButtonLabel } from '@/src/features/walk/utils/walkModeCopy';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { spacing } from '@/src/theme/theme';

export default function InputScreen() {
  const { state, dispatch } = useWalkFlow();
  const scrollRef = useRef<ScrollView>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [voiceDrafts, setVoiceDrafts] = useState<Partial<Record<AddressField, { text: string; revision: number; isFinal: boolean }>>>({});
  const voiceRevision = useRef(0);
  const handleVoiceTranscript = useCallback((field: AddressField, text: string, isFinal: boolean) => {
    voiceRevision.current += 1;
    setVoiceDrafts((current) => ({ ...current, [field]: { text, revision: voiceRevision.current, isFinal } }));
    setValidationError(null);
  }, []);
  const voiceInput = useAddressVoiceInput({
    enabled: true,
    onTranscript: handleVoiceTranscript,
  });
  const stateStatus = useRef(state.status);
  stateStatus.current = state.status;
  useFocusEffect(useCallback(() => {
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
    // Reset only when this screen regains focus. Depending directly on
    // state.status reruns the focus effect during submit and clears the request
    // before the analyzing screen can send it to the API.
    if (stateStatus.current !== 'input') dispatch({ type: 'RESET' });
    return () => cancelAnimationFrame(frame);
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
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow="온:길" brandTagline="노면온도를 고려한 시각장애인·안내견 이동 지원 서비스" />
          <View style={styles.locationSection}>
            <PlaceSearchField
              label="출발지"
              field="origin"
              selected={form.origin}
              placeholder="출발지 주소 검색"
              voiceInputEnabled={!voiceInput.activeField || voiceInput.activeField === 'origin'}
              isListening={voiceInput.activeField === 'origin'}
              voiceDraft={voiceDrafts.origin}
              voiceError={voiceInput.error?.field === 'origin' ? voiceInput.error.message : null}
              onVoiceInputPress={() => void voiceInput.start('origin')}
              onSelect={(place) => {
                voiceInput.stop();
                setValidationError(null);
                dispatch({ type: 'SET_PLACE', field: 'origin', place });
                dispatch({ type: 'SET_PLACE', field: 'destination', place: null });
              }}
            />
            <PlaceSearchField
              label="목적지"
              field="destination"
              selected={form.destination}
              placeholder="목적지 또는 근처 공원 검색"
              voiceInputEnabled={!voiceInput.activeField || voiceInput.activeField === 'destination'}
              isListening={voiceInput.activeField === 'destination'}
              voiceDraft={voiceDrafts.destination}
              voiceError={voiceInput.error?.field === 'destination' ? voiceInput.error.message : null}
              onVoiceInputPress={() => void voiceInput.start('destination')}
              onSelect={(place) => {
                voiceInput.stop();
                setValidationError(null);
                dispatch({ type: 'SET_PLACE', field: 'destination', place });
              }}
            />
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
