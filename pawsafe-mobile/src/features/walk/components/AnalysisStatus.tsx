import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SmoothRouteLoader } from '@/src/features/walk/components/SmoothRouteLoader';
import { colors, spacing, typography } from '@/src/theme/theme';

const steps = [
  { label: '보행로 정보 확인', description: '연결 가능한 보행 Edge를 확인하고 있어요.' },
  { label: 'GMM 열환경 결합', description: '그늘·일사량·포장재 기반 GMM 결과를 결합하고 있어요.' },
  { label: '최단경로 계산', description: '거리만 고려한 최단 보행경로를 찾고 있어요.' },
  { label: '시원한 경로 계산', description: '상대 Heat Cost가 낮은 보행경로를 찾고 있어요.' },
  { label: '경로 점수 계산', description: '두 경로의 열위험 점수와 구간 정보를 정리하고 있어요.' },
];

export function AnalysisStatus() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((value) => (value + 1) % steps.length), 1_250);
    return () => clearInterval(id);
  }, []);

  const currentStep = steps[activeStep];

  return (
    <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.eyebrow}><View style={styles.eyebrowDot} /><Text style={styles.eyebrowText}>온:길 실시간 경로 분석</Text></View>
        <Text style={styles.title}>우리 강아지가 걷기 좋은 길을{`\n`}찾고 있어요</Text>
        <Text style={styles.description}>현재 날씨와 보행로 환경을 한 흐름으로 분석하고 있어요.</Text>
      </View>

      <SmoothRouteLoader walkMode="cool" statusLabel={currentStep.label} statusDescription={currentStep.description} />

      <Text style={styles.scope}>GMM 상대 Heat Cost · 고온 군집 확률 · 경로 거리를 함께 반영해요.</Text>
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
