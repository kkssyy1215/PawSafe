import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export function ScreenHeader({ title, description, eyebrow, brand = false }: { title: string; description?: string; eyebrow?: string; brand?: boolean }) {
  return (
    <View accessible accessibilityRole="header" style={styles.container}>
      {brand ? <View style={styles.brandRow}><Image accessibilityIgnoresInvertColors source={require('../../../assets/brand/pawsafe-mark.png')} style={styles.brandMark} /><Text style={styles.brandName}>PawSafe</Text></View> : eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  brandMark: { width: 34, height: 34, borderRadius: 10 },
  brandName: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: colors.greenStrong },
  eyebrow: { ...typography.caption, color: colors.greenStrong, fontWeight: '700' },
  title: { ...typography.title, color: colors.text },
  description: { ...typography.body, color: colors.mutedText },
});
