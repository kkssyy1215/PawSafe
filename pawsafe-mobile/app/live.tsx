import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Place } from '@/src/api/contracts';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { PawSafeMap } from '@/src/components/map/PawSafeMap';
import { env } from '@/src/config/env';
import { useCurrentLocation } from '@/src/features/walk/hooks/useCurrentLocation';
import { formatDistance } from '@/src/features/walk/utils/formatDistance';
import { formatDuration } from '@/src/features/walk/utils/formatDuration';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function LiveWalkScreen() {
  const { state, dispatch } = useWalkFlow();
  const resultState = state.status === 'comparison' || state.status === 'segmentReview' ? state : null;
  const { getCurrentPlace, message } = useCurrentLocation();
  const requestedLocation = useRef(false);
  const [currentLocation, setCurrentLocation] = useState<Place | null>(resultState?.request.origin ?? null);

  useEffect(() => { AccessibilityInfo.announceForAccessibility('선택한 산책길 보기 화면'); }, []);
  useEffect(() => {
    if (env.locationMode !== 'device' || requestedLocation.current) return;
    requestedLocation.current = true;
    void getCurrentPlace().then((place) => { if (place) setCurrentLocation(place); });
  }, [getCurrentPlace]);

  if (!resultState) return <ScreenContainer style={styles.missing}><Text style={styles.missingText}>표시할 산책 경로가 없습니다.</Text><AppButton onPress={() => router.replace('/')}>처음 화면으로</AppButton></ScreenContainer>;
  const { request, result, selectedRoute } = resultState;
  const route = selectedRoute === 'shortest' ? result.shortest : result.pawsafe;
  const routeLabel = selectedRoute === 'shortest'
    ? route.route_source.toLowerCase().includes('kakao') ? '카카오맵 빠른 경로' : '일반 최단경로'
    : 'PawSafe 추천경로';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WALKING DIRECTION</Text>
          <Text style={styles.title}>{routeLabel}를 따라 걸어보세요</Text>
          <Text style={styles.description}>현재 위치와 전체 산책경로, 목적지를 한눈에 확인할 수 있어요.</Text>
        </View>
        <PawSafeMap
          origin={request.origin}
          destination={request.destination}
          currentLocation={currentLocation}
          shortest={selectedRoute === 'shortest' ? result.shortest : undefined}
          pawsafe={selectedRoute === 'pawsafe' ? result.pawsafe : undefined}
          selectedRoute={selectedRoute}
          walkMode={selectedRoute === 'shortest' ? 'fast' : 'cool'}
          showRouteLegend={false}
        />
        <View accessible accessibilityLabel={`${routeLabel}, 남은 거리 ${formatDistance(route.distance_m)}, 예상 남은 시간 ${formatDuration(route.duration_min)}`} style={styles.summary}>
          <View style={styles.destination}><Text style={styles.destinationLabel}>목적지</Text><Text style={styles.destinationName}>{request.destination.name}</Text></View>
          <View style={styles.stats}><Stat label="남은 거리" value={formatDistance(route.distance_m)} /><Stat label="예상 남은 시간" value={formatDuration(route.duration_min)} /></View>
        </View>
        {message ? <Text style={styles.locationMessage}>{message}</Text> : null}
        <AppButton variant="secondary" onPress={() => router.back()}>경로 비교로 돌아가기</AppButton>
        <AppButton onPress={() => { dispatch({ type: 'RESET' }); router.dismissAll(); router.replace('/'); }}>산책 종료</AppButton>
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { gap: spacing.xs }, eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '800', fontSize: 10 },
  title: { ...typography.heading, color: colors.text }, description: { ...typography.caption, color: colors.mutedText },
  summary: { borderWidth: 1, borderColor: '#B9DEBF', borderRadius: 16, backgroundColor: colors.greenSoft, padding: spacing.lg, gap: spacing.md },
  destination: { gap: 2 }, destinationLabel: { ...typography.caption, color: colors.mutedText }, destinationName: { ...typography.subheading, color: colors.text, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: spacing.md }, stat: { flex: 1, gap: 2 }, statLabel: { ...typography.caption, color: colors.mutedText }, statValue: { ...typography.heading, color: colors.greenStrong },
  locationMessage: { ...typography.caption, color: colors.mutedText, textAlign: 'center' },
  missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }, missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});
