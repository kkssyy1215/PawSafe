import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export function ScreenHeader({ title, description, eyebrow }: { title: string; description?: string; eyebrow?: string }) {
  return (
    <View accessible accessibilityRole="header" style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  title: { ...typography.title, color: colors.text },
  description: { ...typography.body, color: colors.mutedText },
});
