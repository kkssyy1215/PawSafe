import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SmoothRouteLoader } from '@/src/features/walk/components/SmoothRouteLoader';
import { colors, spacing, typography } from '@/src/theme/theme';

const steps = [
  { label: '포장재 정보 결합', description: '보행로의 포장재와 흡수율을 확인하고 있어요.' },
  { label: '기상정보 분석', description: '현재 AWS 관측값과 ASOS 기준자료를 결합하고 있어요.' },
  { label: '일사량과 그늘 분석', description: '최근 햇빛 노출과 시간대별 그늘 비율을 계산하고 있어요.' },
  { label: 'Edge Heat Cost 계산', description: '각 보행로의 상대적인 열노출 값을 계산하고 있어요.' },
  { label: '시원한 경로 탐색', description: '열노출이 낮은 산책길을 부드럽게 이어 찾고 있어요.' },
];

export function AnalysisStatus({ isMock }: { isMock: boolean }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((value) => (value + 1) % steps.length), 1_250);
    return () => clearInterval(id);
  }, []);

  const currentStep = steps[activeStep];
  const description = `${currentStep.description}${isMock ? ' 시연용 분석 데이터를 사용 중입니다.' : ''}`;

  return (
    <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.eyebrow}><View style={styles.eyebrowDot} /><Text style={styles.eyebrowText}>PAWSAFE LIVE ANALYSIS</Text></View>
        <Text style={styles.title}>우리 강아지가 걷기 좋은 길을{`\n`}찾고 있어요</Text>
        <Text style={styles.description}>현재 날씨와 보행로 환경을 한 흐름으로 분석하고 있어요.</Text>
      </View>

      <SmoothRouteLoader walkMode="cool" statusLabel={currentStep.label} statusDescription={description} />

      <Text style={styles.scope}>포장재 · AWS·ASOS 기상 · 일사량 · 그늘 · Heat Cost를 함께 반영해요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  heading: { gap: spacing.xs },
  eyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: colors.greenSoft, paddingHorizontal: 9, paddingVertical: 5 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.greenStrong },
  eyebrowText: { ...typography.caption, color: colors.greenStrong, fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 0.3 },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.mutedText },
  scope: { ...typography.caption, color: colors.mutedText, textAlign: 'center' },
});
