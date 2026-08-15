import { useCallback } from 'react';
import { AccessibilityInfo, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { PawSafeMap } from '@/src/components/map/PawSafeMap';
import { DemoNotice } from '@/src/features/walk/components/DemoNotice';
import { HeatSegmentCard, heatLevelCopy } from '@/src/features/walk/components/HeatSegmentCard';
import { RelativeHeatNotice } from '@/src/features/walk/components/RelativeHeatNotice';
import { RouteEndpointsCard } from '@/src/features/walk/components/RouteEndpointsCard';
import { RecommendedRouteCard } from '@/src/features/walk/components/RecommendedRouteCard';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function SegmentsScreen() {
  const { state, dispatch } = useWalkFlow();
  const resultState = state.status === 'segmentReview' || state.status === 'comparison' ? state : null;
  useFocusEffect(useCallback(() => {
    AccessibilityInfo.announceForAccessibility(resultState?.request.walk_mode === 'fast' ? '카카오 빠른 산책길 결과 화면' : '구간별 상대 열노출 화면');
    if (state.status === 'comparison') dispatch({ type: 'SHOW_SEGMENTS' });
  }, [dispatch, resultState?.request.walk_mode, state.status]));
  if (!resultState) return <ScreenContainer style={styles.missing}><Text style={styles.missingText}>먼저 경로를 분석해 주세요.</Text><AppButton onPress={() => { dispatch({ type: 'RESET' }); router.replace('/'); }}>조건 입력으로 이동</AppButton></ScreenContainer>;
  const { request, result } = resultState;
  const isFast = request.walk_mode === 'fast';
  const recommendedSegment = result.heat_segments.find((segment) => segment.level === 'low') ?? result.heat_segments[0] ?? null;
  const selectedId = (state.status === 'segmentReview' ? state.selectedSegmentId : null) ?? recommendedSegment?.edge_id ?? null;
  const selected = result.heat_segments.find((segment) => segment.edge_id === selectedId) ?? null;
  const representativeSegments = selectRepresentativeSegments(result.heat_segments, recommendedSegment?.edge_id, 12);
  const selectedIndex = selected ? result.heat_segments.findIndex((segment) => segment.edge_id === selected.edge_id) : -1;
  const selectedForDisplay = selected && selectedIndex >= 0 ? { ...selected, display_name: getSegmentDisplayName(selected.display_name, selectedIndex) } : selected;
  const selectSegment = (id: string) => dispatch({ type: 'SELECT_SEGMENT', id });
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, isFast ? styles.fastHero : styles.coolHero]}>
          <View style={[styles.heroBadge, isFast ? styles.fastBadge : styles.coolBadge]}><View style={[styles.heroBadgeDot, { backgroundColor: isFast ? colors.fastRoute : colors.greenStrong }]} /><Text style={[styles.heroBadgeText, { color: isFast ? colors.fastRoute : colors.greenStrong }]}>{isFast ? '빠른 산책길 탐색 완료' : '열환경 분석 완료'}</Text></View>
          <Text style={styles.heroTitle}>{isFast ? '가장 빠르게 걷는 길을 찾았어요.' : '햇빛 부담이 덜한 길을 찾았어요.'}</Text>
          <Text style={styles.heroDescription}>{isFast ? '실제 카카오 보행 경로를 확인하고 바로 길안내를 시작하세요.' : '노면온도와 그늘 데이터를 반영한 추천 경로예요.'}</Text>
        </View>
        <RouteEndpointsCard origin={request.origin} destination={request.destination} />
        <RecommendedRouteCard route={result.pawsafe} walkMode={request.walk_mode} showHeatMetrics={!isFast} />
        <View style={styles.mapSection}>
          <View style={styles.mapHeading}><View><Text style={styles.sectionTitle}>경로 지도</Text><Text style={styles.sectionHint}>{isFast ? '카카오가 계산한 실제 보행 경로 좌표예요.' : '추천 경로와 구간별 열노출을 한눈에 확인하세요.'}</Text></View><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>경로 반영</Text></View></View>
          <PawSafeMap origin={request.origin} destination={request.destination} pawsafe={result.pawsafe} walkMode={request.walk_mode} segments={isFast ? undefined : result.heat_segments} selectedSegmentId={selectedId} onSegmentPress={selectSegment} showRouteLegend={false} showSegmentLegend={!isFast} />
        </View>
        {result.is_demo ? <DemoNotice analysisSource={result.analysis_source} walkMode={request.walk_mode} /> : null}
        {!isFast ? <>
          <View style={styles.segmentSection}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>구간별 노면 정보</Text>
              <Text style={styles.sectionHint}>전체 {result.heat_segments.length}개 Edge 중 대표 구간 {representativeSegments.length}개를 보여드려요.</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentList} accessibilityRole="list">
              {representativeSegments.map(({ segment, originalIndex }) => {
                const active = selectedId === segment.edge_id;
                const displayName = getSegmentDisplayName(segment.display_name, originalIndex);
                return <Pressable key={segment.edge_id} testID={`segment-${segment.edge_id}`} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${displayName}, ${heatLevelCopy[segment.level]}`} style={[styles.segmentButton, active && styles.active]} onPress={() => selectSegment(segment.edge_id)}><View style={[styles.segmentDot, { backgroundColor: segment.level === 'low' ? colors.low : segment.level === 'medium' ? colors.medium : segment.level === 'high' ? colors.high : colors.unknown }]} /><Text numberOfLines={1} style={styles.segmentName}>{displayName}</Text><Text style={styles.segmentLevel}>{heatLevelCopy[segment.level]}</Text></Pressable>;
              })}
            </ScrollView>
          </View>
          {selectedForDisplay ? <HeatSegmentCard segment={selectedForDisplay} isDemo={result.is_demo} /> : <Text accessibilityLiveRegion="polite" style={styles.prompt}>확인할 구간을 선택해 주세요.</Text>}
          <RelativeHeatNotice />
        </> : null}
        <View style={styles.actions}>
          {isFast && result.pawsafe.navigation_url ? <AppButton onPress={() => Linking.openURL(result.pawsafe.navigation_url!)}>카카오맵에서 길안내 보기</AppButton> : null}
          {!isFast ? <AppButton testID="comparison-button" onPress={() => router.push('/comparison')}>경로 비교하기</AppButton> : null}
          <AppButton variant="quiet" onPress={() => { dispatch({ type: 'RESET' }); router.replace('/'); }}>다른 조건으로 검색</AppButton>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 48, gap: spacing.lg },
  hero: { borderRadius: 24, padding: spacing.xl, gap: spacing.sm, overflow: 'hidden' },
  fastHero: { backgroundColor: '#EEE9FF' },
  coolHero: { backgroundColor: '#E6F5E9' },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: 14, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  fastBadge: { backgroundColor: 'rgba(255,255,255,0.64)' },
  coolBadge: { backgroundColor: 'rgba(255,255,255,0.7)' },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  heroBadgeText: { ...typography.caption, fontWeight: '800' },
  heroTitle: { ...typography.title, color: colors.text, maxWidth: 620 },
  heroDescription: { ...typography.body, color: colors.mutedText, maxWidth: 620 },
  mapSection: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  mapHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, paddingTop: spacing.xs, gap: spacing.md },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: 14, backgroundColor: colors.greenSoft, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.greenStrong },
  liveText: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  segmentSection: { gap: spacing.sm }, sectionHeading: { gap: 2 }, sectionTitle: { ...typography.subheading, color: colors.text }, sectionHint: { ...typography.caption, color: colors.mutedText },
  segmentList: { gap: spacing.sm, paddingVertical: spacing.xs },
  segmentButton: { width: 154, minHeight: 72, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.sm, gap: 2 }, active: { borderColor: colors.greenStrong, backgroundColor: colors.greenSoft },
  segmentDot: { width: 9, height: 9, borderRadius: 5, marginBottom: 2 }, segmentName: { ...typography.caption, color: colors.text, fontWeight: '600' }, segmentLevel: { ...typography.caption, color: colors.mutedText },
  prompt: { ...typography.body, color: colors.mutedText, textAlign: 'center', padding: spacing.lg }, actions: { gap: spacing.sm }, missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }, missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});

function getSegmentDisplayName(name: string, index: number) {
  return name === '이름 없는 보행 구간' ? `경로 ${index + 1} 구간` : name;
}

function selectRepresentativeSegments<T extends { edge_id: string }>(segments: T[], preferredId: string | undefined, limit: number) {
  if (segments.length <= limit) return segments.map((segment, originalIndex) => ({ segment, originalIndex }));
  const indices = new Set<number>([0, segments.length - 1]);
  const preferredIndex = preferredId ? segments.findIndex((segment) => segment.edge_id === preferredId) : -1;
  if (preferredIndex >= 0) indices.add(preferredIndex);
  const slots = Math.max(1, limit - indices.size);
  for (let index = 1; index <= slots; index += 1) indices.add(Math.round(index * (segments.length - 1) / (slots + 1)));
  return [...indices].sort((a, b) => a - b).slice(0, limit).map((originalIndex) => ({ segment: segments[originalIndex], originalIndex }));
}
