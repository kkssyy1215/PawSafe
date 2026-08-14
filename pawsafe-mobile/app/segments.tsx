import { useCallback } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
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
    AccessibilityInfo.announceForAccessibility('구간별 상대 열노출 화면');
    if (state.status === 'comparison') dispatch({ type: 'SHOW_SEGMENTS' });
  }, [dispatch, state.status]));
  if (!resultState) return <ScreenContainer style={styles.missing}><Text style={styles.missingText}>먼저 경로를 분석해 주세요.</Text><AppButton onPress={() => { dispatch({ type: 'RESET' }); router.replace('/'); }}>조건 입력으로 이동</AppButton></ScreenContainer>;
  const { request, result } = resultState;
  const recommendedSegment = result.heat_segments.find((segment) => segment.level === 'low') ?? result.heat_segments[0] ?? null;
  const selectedId = (state.status === 'segmentReview' ? state.selectedSegmentId : null) ?? recommendedSegment?.edge_id ?? null;
  const selected = result.heat_segments.find((segment) => segment.edge_id === selectedId) ?? null;
  const selectSegment = (id: string) => dispatch({ type: 'SELECT_SEGMENT', id });
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow="열환경 분석 완료" title="상대적으로 열노출이 낮은 길을 찾았어요." description="노면온도와 그늘 정보를 바탕으로 추천 경로를 만들었어요." />
        <RouteEndpointsCard origin={request.origin} destination={request.destination} />
        <RecommendedRouteCard route={result.pawsafe} walkMode={request.walk_mode} />
        <PawSafeMap origin={request.origin} destination={request.destination} pawsafe={result.pawsafe} walkMode={request.walk_mode} segments={result.heat_segments} selectedSegmentId={selectedId} onSegmentPress={selectSegment} showRouteLegend={false} showSegmentLegend />
        {result.is_demo ? <DemoNotice analysisSource={result.analysis_source} /> : null}
        <View style={styles.segmentSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>구간별 노면 정보</Text>
            <Text style={styles.sectionHint}>지도 선이나 아래 구간을 누르면 자세히 볼 수 있어요.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentList} accessibilityRole="list">
            {result.heat_segments.map((segment) => {
              const active = selectedId === segment.edge_id;
              return <Pressable key={segment.edge_id} testID={`segment-${segment.edge_id}`} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${segment.display_name}, ${heatLevelCopy[segment.level]}`} style={[styles.segmentButton, active && styles.active]} onPress={() => selectSegment(segment.edge_id)}><View style={[styles.segmentDot, { backgroundColor: segment.level === 'low' ? colors.low : segment.level === 'medium' ? colors.medium : segment.level === 'high' ? colors.high : colors.unknown }]} /><Text numberOfLines={1} style={styles.segmentName}>{segment.display_name}</Text><Text style={styles.segmentLevel}>{heatLevelCopy[segment.level]}</Text></Pressable>;
            })}
          </ScrollView>
        </View>
        {selected ? <HeatSegmentCard segment={selected} isDemo={result.is_demo} /> : <Text accessibilityLiveRegion="polite" style={styles.prompt}>확인할 구간을 선택해 주세요.</Text>}
        <RelativeHeatNotice />
        <View style={styles.actions}>
          <AppButton testID="comparison-button" onPress={() => router.push('/comparison')}>경로 비교하기</AppButton>
          <AppButton variant="quiet" onPress={() => { dispatch({ type: 'RESET' }); router.replace('/'); }}>다른 조건으로 검색</AppButton>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  segmentSection: { gap: spacing.sm }, sectionHeading: { gap: 2 }, sectionTitle: { ...typography.subheading, color: colors.text }, sectionHint: { ...typography.caption, color: colors.mutedText },
  segmentList: { gap: spacing.sm, paddingVertical: spacing.xs },
  segmentButton: { width: 154, minHeight: 72, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.sm, gap: 2 }, active: { borderColor: colors.greenStrong, backgroundColor: colors.greenSoft },
  segmentDot: { width: 9, height: 9, borderRadius: 5, marginBottom: 2 }, segmentName: { ...typography.caption, color: colors.text, fontWeight: '600' }, segmentLevel: { ...typography.caption, color: colors.mutedText },
  prompt: { ...typography.body, color: colors.mutedText, textAlign: 'center', padding: spacing.lg }, actions: { gap: spacing.sm }, missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }, missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});
