import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import type { RouteSafety } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';

interface HeatRiskDecisionModalProps {
  safety: RouteSafety;
  visible: boolean;
  onContinue: () => void;
  onCancelWalk: () => void;
}

export function HeatRiskDecisionModal({ safety, visible, onContinue, onCancelWalk }: HeatRiskDecisionModalProps) {
  if (!visible || !safety.should_warn) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancelWalk}>
      <View style={styles.overlay}>
        <View accessible accessibilityRole="alert" accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>산책 주의</Text>
            <Text style={styles.title}>지금은 산책을 쉬는 게 좋아요</Text>
          </View>
          <View
            accessible
            accessibilityLabel={`이 경로 열위험 점수 ${safety.score}, 기준 ${safety.thresholds.warning_min}`}
            style={styles.heatComparison}
          >
            <Text style={styles.heatLabel}>이 경로 열위험 점수</Text>
            <View style={styles.heatValueRow}>
              <Text style={styles.heatValue}>{safety.score}</Text>
              <Text style={styles.heatThreshold}>/ {safety.thresholds.warning_min}</Text>
            </View>
          </View>
          <View style={styles.copy}>
            <Text style={styles.description}>
              경로 열위험 점수가 {safety.thresholds.warning_min}점 이상이에요. 안전한 시간대로 산책을 미뤄 주세요.
            </Text>
          </View>
          <View style={styles.actions}>
            <AppButton testID="cancel-hot-walk-button" onPress={onCancelWalk}>산책하지 않을게요</AppButton>
            <AppButton testID="continue-hot-walk-button" variant="secondary" onPress={onContinue}>그래도 경로 추천받기</AppButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(24, 28, 25, 0.58)' },
  dialog: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.lg, padding: spacing.xl, borderRadius: 24, backgroundColor: colors.surface },
  icon: { width: 48, height: 48, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.orangeSoft },
  iconText: { ...typography.heading, color: colors.orange, fontWeight: '900' },
  copy: { alignItems: 'center', gap: spacing.xs },
  eyebrow: { ...typography.caption, color: colors.orange, fontWeight: '800', textAlign: 'center' },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  heatComparison: { width: '100%', minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: '#F0D2A5', borderRadius: 16, backgroundColor: colors.orangeSoft },
  heatLabel: { ...typography.body, flexShrink: 1, color: colors.warning, fontWeight: '700' },
  heatValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  heatValue: { ...typography.heading, color: colors.high, fontSize: 24, lineHeight: 28, fontWeight: '900' },
  heatThreshold: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  description: { ...typography.body, color: colors.mutedText, lineHeight: 22, textAlign: 'center' },
  actions: { gap: spacing.sm },
});
