import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export function ScreenHeader({ title, description, eyebrow, compact = false }: { title: string; description?: string; eyebrow?: string; compact?: boolean }) {
  return (
    <View accessible accessibilityRole="header" style={styles.container}>
      {eyebrow === 'PawSafe' ? (
        <View style={styles.brandRow}>
          <Image source={require('../../../assets/brand/pawsafe-mark.png')} accessibilityLabel="PawSafe 강아지 발바닥 로고" resizeMode="contain" style={styles.brandMark} />
          <Text style={styles.brandName}>PawSafe</Text>
        </View>
      ) : eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMark: { width: 30, height: 30 },
  brandName: { ...typography.heading, color: colors.greenStrong, fontWeight: '800' },
  eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  title: { ...typography.title, color: colors.text },
  compactTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  description: { ...typography.body, color: colors.mutedText },
});
