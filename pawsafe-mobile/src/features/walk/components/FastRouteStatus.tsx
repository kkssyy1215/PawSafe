import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SmoothRouteLoader } from '@/src/features/walk/components/SmoothRouteLoader';
import { colors, spacing, typography } from '@/src/theme/theme';

const steps = [
  { label: '출발·도착지 확인', description: '선택한 두 장소의 좌표를 확인하고 있어요.' },
  { label: '카카오맵 경로 연결', description: '카카오맵에서 가장 짧은 보행경로를 불러오고 있어요.' },
  { label: '거리와 시간 정리', description: '총거리와 예상 산책 시간을 확인하고 있어요.' },
];

export function FastRouteStatus() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((value) => (value + 1) % steps.length), 1_050);
    return () => clearInterval(id);
  }, []);

  const currentStep = steps[activeStep];

  return (
    <View accessible accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.eyebrow}><View style={styles.eyebrowDot} /><Text style={styles.eyebrowText}>KAKAO FAST ROUTE</Text></View>
        <Text style={styles.title}>가장 빠른 산책길을{`\n`}찾고 있어요</Text>
        <Text style={styles.description}>열환경 분석 없이 가장 짧은 카카오맵 보행경로를 바로 조회해요.</Text>
      </View>

      <SmoothRouteLoader walkMode="fast" statusLabel={currentStep.label} statusDescription={currentStep.description} />

      <Text style={styles.scope}>카카오맵 보행거리와 예상 시간만 빠르게 확인해요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  heading: { gap: spacing.xs },
  eyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: colors.orangeSoft, paddingHorizontal: 9, paddingVertical: 5 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  eyebrowText: { ...typography.caption, color: colors.orange, fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 0.3 },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.mutedText },
  scope: { ...typography.caption, color: colors.mutedText, textAlign: 'center' },
});
