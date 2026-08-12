import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { CurrentLocationButton } from '@/src/features/walk/components/CurrentLocationButton';
import { DepartureTimePicker } from '@/src/features/walk/components/DepartureTimePicker';
import { DemoNotice } from '@/src/features/walk/components/DemoNotice';
import { PlaceSearchField } from '@/src/features/walk/components/PlaceSearchField';
import { WalkModeSelector } from '@/src/features/walk/components/WalkModeSelector';
import { toLocalIsoWithOffset } from '@/src/features/walk/utils/dateTime';
import { toApiPlace, validateWalkForm } from '@/src/features/walk/utils/validation';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function InputScreen() {
  const { state, dispatch } = useWalkFlow();
  const [validationError, setValidationError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    if (state.status !== 'input') dispatch({ type: 'RESET' });
  }, [dispatch, state.status]));
  useEffect(() => { AccessibilityInfo.announceForAccessibility('산책 조건 입력 화면'); }, []);

  if (state.status !== 'input') return <ScreenContainer><View /></ScreenContainer>;
  const { form } = state;
  const submit = () => {
    const issue = validateWalkForm(form);
    if (issue) { setValidationError(issue); AccessibilityInfo.announceForAccessibility(issue); return; }
    if (!form.origin || !form.destination) return;
    dispatch({ type: 'BEGIN_SUBMIT', request: {
      // Search results also carry client-only coverage metadata. Explicitly build
      // the API location objects because FastAPI forbids unknown request fields.
      origin: toApiPlace(form.origin),
      destination: toApiPlace(form.destination),
      departure_at: toLocalIsoWithOffset(form.departureAt),
      walk_mode: form.walkMode,
    } });
    router.push('/analyzing');
  };
  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <ScreenHeader eyebrow="PawSafe" title="산책 조건을 선택해 주세요" description="일반 경로와 상대 Heat Cost를 낮춘 예시 경로를 같은 조건에서 비교합니다." />
          <DemoNotice />
          <View style={styles.section}>
            <Text style={styles.step}>1 · 장소</Text>
            <PlaceSearchField label="출발지" field="origin" selected={form.origin} onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'origin', place }); }} />
            {!form.origin ? <CurrentLocationButton onSelect={(place) => dispatch({ type: 'SET_PLACE', field: 'origin', place })} /> : null}
            <PlaceSearchField label="목적지" field="destination" selected={form.destination} onSelect={(place) => { setValidationError(null); dispatch({ type: 'SET_PLACE', field: 'destination', place }); }} />
          </View>
          <View style={styles.section}>
            <Text style={styles.step}>2 · 시간</Text>
            <DepartureTimePicker value={form.departureAt} onChange={(value) => { setValidationError(null); dispatch({ type: 'SET_DEPARTURE', value }); }} />
          </View>
          <View style={styles.section}>
            <Text style={styles.step}>3 · 비교 기준</Text>
            <WalkModeSelector value={form.walkMode} onChange={(value) => dispatch({ type: 'SET_WALK_MODE', value })} />
          </View>
          {validationError ? <Notice tone="error" accessibilityLiveRegion="assertive">{validationError}</Notice> : null}
          <AppButton
            testID="analyze-button"
            disabled={!form.origin || !form.destination}
            accessibilityHint="선택한 조건으로 경로 비교를 요청합니다."
            onPress={submit}
          >경로 분석하기</AppButton>
          <Text style={styles.privacy}>현재 위치는 출발지 선택에만 일시적으로 사용하며 기기에 영구 저장하지 않습니다.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  section: { gap: spacing.md }, step: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  privacy: { ...typography.caption, color: colors.mutedText, textAlign: 'center' },
});
