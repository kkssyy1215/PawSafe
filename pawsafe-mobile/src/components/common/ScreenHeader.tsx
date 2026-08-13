import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

interface ScreenHeaderProps {
  title?: string;
  description?: string;
  eyebrow?: string;
  compact?: boolean;
  brandTagline?: string;
}

export function ScreenHeader({ title, description, eyebrow, compact = false, brandTagline }: ScreenHeaderProps) {
  return (
    <View accessible accessibilityRole="header" style={styles.container}>
      {eyebrow === 'PawSafe' ? (
        <View style={styles.brandBlock}>
          <View style={styles.brandRow}>
            <View style={styles.brandMarkFrame}>
              <Image source={require('../../../assets/brand/pawsafe-mark.png')} accessibilityLabel="PawSafe 강아지 발바닥 로고" resizeMode="contain" style={styles.brandMark} />
            </View>
            <Text style={styles.brandName}>PawSafe</Text>
          </View>
          {brandTagline ? <Text style={styles.brandTagline}>{brandTagline}</Text> : null}
        </View>
      ) : eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  brandBlock: { gap: 2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brandMarkFrame: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brandMark: { width: 30, height: 30, transform: [{ scale: 2 }] },
  brandName: { ...typography.heading, color: colors.greenStrong, fontWeight: '800' },
  brandTagline: { ...typography.caption, color: colors.mutedText },
  eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  title: { ...typography.title, color: colors.text },
  compactTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  description: { ...typography.body, color: colors.mutedText },
});
