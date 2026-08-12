import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/theme';

export const AppTextField = forwardRef<TextInput, TextInputProps>(function AppTextField({ style, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.mutedText}
      style={[styles.input, style]}
      returnKeyType="search"
      {...props}
    />
  );
});
const styles = StyleSheet.create({
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface, ...typography.body },
});
