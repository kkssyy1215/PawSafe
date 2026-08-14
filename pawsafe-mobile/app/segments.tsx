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
  const selectedId = state.status === 'segmentReview' ? state.selectedSegmentId : null;
  const selected = result.heat_segments.find((segment) => segment.edge_id === selectedId) ?? null;
  const selectSegment = (id: string) => dispatch({ type: 'SELECT_SEGMENT', id });
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow="열환경 분석 완료" title="상대적으로 열노출이 낮은 길을 찾았어요." description="노면온도와 그늘 정보를 바탕으로 추천 경로를 만들었어요." />
        {result.is_demo ? <DemoNotice analysisSource={result.analysis_source} /> : null}
        <PawSafeMap origin={request.origin} destination={request.destination} pawsafe={result.pawsafe} segments={result.heat_segments} selectedSegmentId={selectedId} onSegmentPress={selectSegment} showRouteLegend={false} showSegmentLegend />
        <RelativeHeatNotice />
        <View accessibilityRole="list" style={styles.segmentList}>
          {result.heat_segments.map((segment) => {
            const active = selectedId === segment.edge_id;
            return <Pressable key={segment.edge_id} testID={`segment-${segment.edge_id}`} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${segment.display_name}, ${heatLevelCopy[segment.level]}`} style={[styles.segmentButton, active && styles.active]} onPress={() => selectSegment(segment.edge_id)}><Text style={styles.segmentName}>{segment.display_name}</Text><Text style={styles.segmentLevel}>{heatLevelCopy[segment.level]} · 상세 보기</Text></Pressable>;
          })}
        </View>
        {selected ? <HeatSegmentCard segment={selected} isDemo={result.is_demo} /> : <Text accessibilityLiveRegion="polite" style={styles.prompt}>확인할 구간을 선택해 주세요.</Text>}
        <AppButton testID="comparison-button" onPress={() => router.push('/comparison')}>경로 비교하기</AppButton>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, segmentList: { gap: spacing.sm },
  segmentButton: { minHeight: 58, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md }, active: { borderColor: colors.greenStrong, backgroundColor: colors.greenSoft },
  segmentName: { ...typography.body, color: colors.text, fontWeight: '600' }, segmentLevel: { ...typography.caption, color: colors.mutedText },
  prompt: { ...typography.body, color: colors.mutedText, textAlign: 'center', padding: spacing.lg }, missing: { justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }, missingText: { ...typography.body, color: colors.text, textAlign: 'center' },
});
