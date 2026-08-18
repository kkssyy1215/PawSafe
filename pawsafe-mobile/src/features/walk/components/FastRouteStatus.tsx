import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SmoothRouteLoader } from '@/src/features/walk/components/SmoothRouteLoader';
import { colors, spacing, typography } from '@/src/theme/theme';

const steps = [
  { label: '출발·도착지 확인', description: '선택한 두 장소의 좌표를 확인하고 있어요.' },
  { label: '보행로 그래프 연결', description: '온:길 보행로 그래프에서 연결 가능한 길을 확인하고 있어요.' },
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
        <View style={styles.eyebrow}><View style={styles.eyebrowDot} /><Text style={styles.eyebrowText}>온:길 빠른 경로</Text></View>
        <Text style={styles.title}>가장 빠른 산책길을{`\n`}찾고 있어요</Text>
        <Text style={styles.description}>온:길 보행로 그래프에서 거리 기준 최단경로를 계산해요.</Text>
      </View>

      <SmoothRouteLoader walkMode="fast" statusLabel={currentStep.label} statusDescription={currentStep.description} />

      <Text style={styles.scope}>시원한 산책과 같은 보행로 그래프의 최단경로를 확인해요.</Text>
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
