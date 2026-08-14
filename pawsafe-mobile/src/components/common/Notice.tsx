import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export function Notice({ children, tone = 'info', accessibilityLiveRegion }: { children: ReactNode; tone?: 'info' | 'warning' | 'error'; accessibilityLiveRegion?: 'none' | 'polite' | 'assertive' }) {
  return (
    <View accessible accessibilityLiveRegion={accessibilityLiveRegion} style={[styles.notice, styles[tone]]}>
      <Text style={[styles.text, tone === 'error' && styles.errorText]}>{children}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  notice: { borderRadius: 12, padding: spacing.md, borderWidth: 1 },
  info: { backgroundColor: colors.greenSoft, borderColor: '#C6D9CD' },
  warning: { backgroundColor: colors.orangeSoft, borderColor: '#E6C99F' },
  error: { backgroundColor: colors.errorSoft, borderColor: '#E1B9B4' },
  text: { ...typography.caption, color: colors.text },
  errorText: { color: colors.error },
});
