import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, spacing } from '@/src/theme/theme';

export function AppCard({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return <View style={[styles.card, style]} {...props}>{children}</View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg },
});
