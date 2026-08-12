import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

interface AppButtonProps extends Omit<ComponentProps<typeof Pressable>, 'children' | 'style'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

export function AppButton({ children, variant = 'primary', loading, disabled, fullWidth = true, ...props }: AppButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.green} /> : null}
        <Text style={[styles.label, variant === 'primary' || variant === 'danger' ? styles.lightLabel : styles.darkLabel]}>{children}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  fullWidth: { width: '100%' },
  primary: { backgroundColor: colors.greenStrong, borderColor: colors.greenStrong },
  secondary: { backgroundColor: colors.surface, borderColor: colors.green },
  quiet: { backgroundColor: 'transparent', borderColor: colors.border },
  danger: { backgroundColor: colors.error, borderColor: colors.error },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: typography.button,
  lightLabel: { color: colors.white },
  darkLabel: { color: colors.greenStrong },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.78 },
});
