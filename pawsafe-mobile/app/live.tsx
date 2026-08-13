import { useEffect } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/src/components/common/AppButton';
import { Notice } from '@/src/components/common/Notice';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { ScreenHeader } from '@/src/components/common/ScreenHeader';
import { LiveWalkMap } from '@/src/components/map/LiveWalkMap';
import { useWalkFlow } from '@/src/state/WalkFlowContext';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function LiveWalkScreen() {
  const { dispatch } = useWalkFlow();
  useEffect(() => { AccessibilityInfo.announceForAccessibility('실시간 산책 도우미 화면'); }, []);
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="실시간 산책 도우미" compact title="우리 강아지가 걷기 좋은 길을 실시간으로 확인해요." description="현재 위치와 노면 열환경을 함께 보고 있어요." />
        <LiveWalkMap />
        <View accessible accessibilityLabel="현재 열환경 안전, 노면온도 32도, 햇빛 노출 낮음, 그늘 비율 80퍼센트" style={styles.safeCard}>
          <Text style={styles.safeTitle}>현재 열환경 · 안전</Text>
          <View style={styles.stats}><Stat label="노면 온도" value="32°C" /><Stat label="햇빛 노출" value="낮음" /><Stat label="그늘 비율" value="80%" /></View>
        </View>
        <Notice tone="warning">실시간 알림{`\n`}앞으로 100m, 그늘 없는 구간이 있어요. 우회 경로를 추천해 드릴까요?</Notice>
        <AppButton variant="warning" onPress={() => router.replace('/segments')}>그늘 찾아 우회하기</AppButton>
        <AppButton onPress={() => { dispatch({ type: 'RESET' }); router.replace('/'); }}>산책 종료</AppButton>
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  safeCard: { backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: colors.greenStrong, borderRadius: 14, padding: spacing.md, gap: spacing.sm },
  safeTitle: { ...typography.body, color: colors.greenStrong, fontWeight: '700' }, stats: { flexDirection: 'row', justifyContent: 'space-between' }, stat: { flex: 1, gap: 2 }, statLabel: { ...typography.caption, color: colors.mutedText }, statValue: { ...typography.body, color: colors.text, fontWeight: '700' },
});
