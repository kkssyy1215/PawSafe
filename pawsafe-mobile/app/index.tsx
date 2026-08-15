import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { CurrentLocationButton } from '@/src/features/walk/components/CurrentLocationButton';
import { DepartureTimePicker } from '@/src/features/walk/components/DepartureTimePicker';
import { PlaceSearchField } from '@/src/features/walk/components/PlaceSearchField';
import { NearbyWalkPlaces } from '@/src/features/walk/components/NearbyWalkPlaces';
import { SavedPlacePicker } from '@/src/features/walk/components/SavedPlacePicker';
import { WalkModeSelector } from '@/src/features/walk/components/WalkModeSelector';
import { useSavedPlaces } from '@/src/features/walk/hooks/useSavedPlaces';
import { toLocalIsoWithOffset } from '@/src/features/walk/utils/dateTime';
import { savePendingRouteRequest } from '@/src/features/walk/utils/pendingRouteRequest';
import { toApiPlace, validateWalkForm } from '@/src/features/walk/utils/validation';
import { getWalkSearchButtonLabel } from '@/src/features/walk/utils/walkModeCopy';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function InputScreen() {
  const { state, dispatch } = useWalkFlow();
  const { savedPlaces, savePlace, removePlace } = useSavedPlaces();
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
  const submitLabel = getWalkSearchButtonLabel(form.walkMode);
  const submit = () => {
    const issue = validateWalkForm(form);
    if (issue) { setValidationError(issue); AccessibilityInfo.announceForAccessibility(issue); return; }
    if (!form.origin || !form.destination) return;
    const request = {
      // Search results also carry client-only coverage metadata. Explicitly build
      // the API location objects because FastAPI forbids unknown request fields.
      origin: toApiPlace(form.origin),
      destination: toApiPlace(form.destination),
      departure_at: toLocalIsoWithOffset(form.departureAt),
      walk_mode: form.walkMode,
    };
    savePendingRouteRequest(request);
    dispatch({ type: 'BEGIN_SUBMIT', request });
    router.push({ pathname: '/analyzing', params: { walkMode: request.walk_mode } });
  };
  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <ScreenHeader eyebrow="PawSafe" brandTagline="우리 강아지의 발바닥을 안전하게" />
          <View style={styles.section}>
            <PlaceSearchField label="출발지" field="origin" selected={form.origin} onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'origin', place }); }} />
            <SavedPlacePicker
              selectedOrigin={form.origin}
              savedPlaces={savedPlaces}
              onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'origin', place }); }}
              onSave={(label) => { if (form.origin) void savePlace(form.origin, label); }}
              onDelete={removePlace}
            />
            {!form.origin ? <CurrentLocationButton onSelect={(place) => dispatch({ type: 'SET_PLACE', field: 'origin', place })} /> : null}
            <PlaceSearchField label="목적지" field="destination" selected={form.destination} onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'destination', place }); }} />
            <NearbyWalkPlaces origin={form.origin} selected={form.destination} onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'destination', place }); }} />
          </View>
          <View style={styles.section}>
            <DepartureTimePicker value={form.departureAt} onChange={(value) => { setValidationError(null); dispatch({ type: 'SET_DEPARTURE', value }); }} />
          </View>
          <View style={styles.section}>
            <WalkModeSelector value={form.walkMode} onChange={(value) => dispatch({ type: 'SET_WALK_MODE', value })} />
          </View>
          {validationError ? <Notice tone="error" accessibilityLiveRegion="assertive">{validationError}</Notice> : null}
          <AppButton
            testID="analyze-button"
            disabled={!form.origin || !form.destination}
            accessibilityHint="선택한 조건으로 경로 비교를 요청합니다."
            onPress={submit}
          >{submitLabel}</AppButton>
          <Text style={styles.privacy}>저장한 장소는 이 기기에만 보관되며, 언제든 삭제할 수 있어요.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  section: { gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md },
  privacy: { ...typography.caption, color: colors.mutedText, textAlign: 'center' },
});
