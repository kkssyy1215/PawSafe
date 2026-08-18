import { useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { PawSafeMap } from '@/src/components/map/PawSafeMap';
import { useVoiceAccessibility } from '@/src/features/accessibility/VoiceAccessibilityContext';
import { useForegroundNavigation } from '@/src/features/navigation/useForegroundNavigation';
import { HeatRiskWarning } from '@/src/features/walk/components/HeatRiskWarning';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function LiveWalkScreen() {
  const { state, dispatch } = useWalkFlow();
  const { guidanceEnabled, setGuidanceEnabled } = useVoiceAccessibility();
  const [followCurrentLocation, setFollowCurrentLocation] = useState(false);
  const resultState = state.status === 'comparison' || state.status === 'segmentReview' ? state : null;
  const selectedRoute = resultState?.selectedRoute ?? 'pawsafe';
  const route = resultState
    ? selectedRoute === 'shortest' ? resultState.result.shortest : resultState.result.pawsafe
    : null;
  const navigation = useForegroundNavigation({
    route,
    destination: resultState?.request.destination ?? null,
    voiceEnabled: guidanceEnabled,
  });

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('선택한 산책길 안내 화면');
  }, []);

  if (!resultState || !route) {
    return <ScreenContainer style={styles.missing}><Text style={styles.missingText}>표시할 산책 경로가 없습니다.</Text><AppButton onPress={() => router.replace('/')}>처음 화면으로</AppButton></ScreenContainer>;
  }

  const { request, result } = resultState;
  const routeLabel = selectedRoute === 'shortest'
    ? route.route_source.toLowerCase().includes('kakao') ? '카카오맵 빠른 경로' : '일반 최단경로'
    : '온:길 추천경로';
  const isTracking = navigation.status === 'active';
  const statusLabel = navigation.status === 'requesting' ? '현재 위치 확인 중'
    : navigation.status === 'active' ? navigation.isOffRoute ? '경로 이탈' : '실시간 안내 중'
      : navigation.status === 'paused' ? '안내 일시정지'
        : navigation.status === 'arrived' ? '산책 완료'
          : navigation.status === 'error' ? '위치 확인 필요' : '안내 시작 전';

  const endWalk = () => {
    navigation.stop();
    dispatch({ type: 'RESET' });
    router.dismissAll();
    router.replace('/');
  };

  const returnToComparison = () => {
    navigation.stop();
    router.back();
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>WALKING DIRECTION</Text>
            <Text style={styles.title}>{routeLabel} 경로 안내</Text>
            <Text style={styles.description}>현재 위치를 따라가며 회전 방향과 남은 거리를 안내해 드려요.</Text>
          </View>
          <View style={styles.voiceToggle}>
            <Text style={styles.voiceToggleLabel}>음성 안내</Text>
            <Switch
              accessibilityLabel={`음성 안내 ${guidanceEnabled ? '켜짐' : '꺼짐'}`}
              value={guidanceEnabled}
              onValueChange={setGuidanceEnabled}
              trackColor={{ false: '#CFD6CF', true: '#9FD5A8' }}
              thumbColor={guidanceEnabled ? colors.greenStrong : '#F5F5F5'}
              style={styles.voiceSwitch}
            />
          </View>
        </View>

        <HeatRiskWarning safety={route.safety} />

        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${statusLabel}. ${navigation.currentInstruction}`}
          style={[styles.instructionCard, navigation.isOffRoute && styles.instructionCardWarning]}
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isTracking && styles.statusDotActive, navigation.isOffRoute && styles.statusDotWarning]} />
            <Text style={[styles.statusLabel, navigation.isOffRoute && styles.warningText]}>{statusLabel}</Text>
            {navigation.voiceEnabled ? <Text style={styles.voiceLabel}>음성 켜짐</Text> : <Text style={styles.voiceMutedLabel}>음성 꺼짐</Text>}
          </View>
          <Text style={styles.instruction}>{navigation.currentInstruction}</Text>
          {navigation.accuracyM !== null ? <Text style={styles.accuracy}>GPS 정확도 약 {Math.round(navigation.accuracyM)}m</Text> : null}
        </View>

        <View style={styles.mapSection}>
          <View style={styles.mapHeading}>
            <View style={styles.mapHeadingText}>
              <Text style={styles.mapTitle}>안내 중인 전체 경로</Text>
              <Text style={styles.mapDescription}>{followCurrentLocation ? '현재 위치를 따라 지도를 이동하고 있어요.' : '출발지부터 목적지까지 경로 전체를 보여드려요.'}</Text>
            </View>
            <AppButton
              fullWidth={false}
              variant="secondary"
              disabled={!navigation.currentLocation}
              onPress={() => setFollowCurrentLocation((current) => !current)}
            >{followCurrentLocation ? '전체 경로' : '현재 위치'}</AppButton>
          </View>
          <PawSafeMap
            origin={request.origin}
            destination={request.destination}
            currentLocation={navigation.currentLocation ?? request.origin}
            shortest={selectedRoute === 'shortest' ? result.shortest : undefined}
            pawsafe={selectedRoute === 'pawsafe' ? result.pawsafe : undefined}
            selectedRoute={selectedRoute}
            walkMode={selectedRoute === 'shortest' ? 'fast' : 'cool'}
            followCurrentLocation={isTracking && followCurrentLocation}
            showRouteLegend={false}
          />
        </View>

        <View
          accessible
          accessibilityLabel={`${routeLabel}, 남은 거리 ${formatDistance(navigation.remainingDistanceM)}, 예상 남은 시간 ${formatDuration(navigation.remainingDurationMin)}`}
          style={styles.summary}
        >
          <View style={styles.destination}>
            <Text style={styles.destinationLabel}>목적지</Text>
            <Text style={styles.destinationName}>{request.destination.name}</Text>
          </View>
          <View style={styles.stats}>
            <Stat label="남은 거리" value={formatDistance(navigation.remainingDistanceM)} />
            <Stat label="예상 남은 시간" value={formatDuration(navigation.remainingDurationMin)} />
          </View>
        </View>

        <View style={styles.safetyNotice} accessible>
          <Text style={styles.safetyTitle}>안전 안내</Text>
          <Text style={styles.safetyText}>GPS 기반 보조 안내입니다. 횡단보도, 차량, 턱과 장애물은 보행자가 직접 확인해 주세요. iPhone에서는 음성을 들을 수 있도록 무음 모드를 해제해 주세요.</Text>
        </View>

        {navigation.status === 'idle' || navigation.status === 'error' || navigation.status === 'arrived' ? (
          <AppButton onPress={() => void navigation.start()}>
            {navigation.status === 'arrived' ? '산책길 안내 다시 시작' : '산책길 안내 시작'}
          </AppButton>
        ) : null}
        {navigation.status === 'requesting' ? <AppButton loading>현재 위치 확인 중</AppButton> : null}
        {navigation.status === 'paused' ? <AppButton onPress={() => void navigation.resume()}>산책길 안내 계속하기</AppButton> : null}
        {navigation.status === 'active' ? <>
          {guidanceEnabled ? <AppButton variant="secondary" onPress={navigation.repeatInstruction}>안내 다시 듣기</AppButton> : null}
          <AppButton variant="quiet" onPress={navigation.pause}>안내 일시정지</AppButton>
        </> : null}
        {navigation.errorMessage ? <Text accessibilityLiveRegion="assertive" style={styles.errorMessage}>{navigation.errorMessage}</Text> : null}
        <AppButton variant="secondary" onPress={returnToComparison}>경로 비교로 돌아가기</AppButton>
        <AppButton onPress={endWalk}>산책 종료</AppButton>
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  header: { flex: 1, gap: spacing.xs },
  voiceToggle: { marginLeft: 'auto', alignItems: 'center', gap: 1, paddingTop: 1 },
  voiceToggleLabel: { ...typography.caption, color: colors.mutedText, fontSize: 10, fontWeight: '700' },
  voiceSwitch: { transform: [{ scaleX: 0.76 }, { scaleY: 0.76 }], marginHorizontal: -7, marginVertical: -4 },
  eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '800', fontSize: 10 },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.mutedText },
  instructionCard: { borderWidth: 1, borderColor: '#B9DEBF', borderRadius: 16, backgroundColor: colors.greenSoft, padding: spacing.lg, gap: spacing.sm },
  instructionCardWarning: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.unknown },
  statusDotActive: { backgroundColor: colors.greenStrong },
  statusDotWarning: { backgroundColor: colors.orange },
  statusLabel: { ...typography.caption, color: colors.greenStrong, fontWeight: '700', flex: 1 },
  voiceLabel: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  voiceMutedLabel: { ...typography.caption, color: colors.mutedText, fontWeight: '700' },
  instruction: { ...typography.heading, color: colors.text },
  accuracy: { ...typography.caption, color: colors.mutedText },
  warningText: { color: colors.warning },
  mapSection: { gap: spacing.sm },
  mapHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mapHeadingText: { flex: 1, gap: 1 },
  mapTitle: { ...typography.subheading, color: colors.text, fontWeight: '700' },
  mapDescription: { ...typography.caption, color: colors.mutedText, fontSize: 11 },
  summary: { borderWidth: 1, borderColor: '#B9DEBF', borderRadius: 16, backgroundColor: colors.greenSoft, padding: spacing.lg, gap: spacing.md },
  destination: { gap: 2 },
  destinationLabel: { ...typography.caption, color: colors.mutedText },
  destinationName: { ...typography.subheading, color: colors.text, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  statLabel: { ...typography.caption, color: colors.mutedText },
  statValue: { ...typography.heading, color: colors.greenStrong },
  safetyNotice: { borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  safetyTitle: { ...typography.caption, color: colors.text, fontWeight: '700' },
  safetyText: { ...typography.caption, color: colors.mutedText },
  errorMessage: { ...typography.caption, color: colors.error, textAlign: 'center' },
  missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});
