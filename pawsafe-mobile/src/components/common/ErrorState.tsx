import { StyleSheet, Text, View } from 'react-native';
import type { AppError } from '@/src/api/errors';
import { getErrorCopy } from '@/src/api/errors';
import { colors, spacing, typography } from '@/src/theme/theme';
import { AppButton } from './AppButton';

export function ErrorState({ error, onRetry, onReset }: { error: AppError; onRetry?: () => void; onReset: () => void }) {
  const copy = getErrorCopy(error);
  return (
    <View accessible accessibilityLiveRegion="assertive" style={styles.container}>
      <Text style={styles.symbol} accessibilityElementsHidden>!</Text>
      <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
      <Text style={styles.description}>{copy.description}</Text>
      <View style={styles.actions}>
        {onRetry ? <AppButton onPress={onRetry}>다시 시도</AppButton> : null}
        <AppButton variant="secondary" onPress={onReset}>다른 조건으로 검색</AppButton>
      </View>
      {error.requestId ? <Text style={styles.requestId}>문의 코드: {error.requestId}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  symbol: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.errorSoft, color: colors.error, textAlign: 'center', textAlignVertical: 'center', fontSize: 28, fontWeight: '700' },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  description: { ...typography.body, color: colors.mutedText, textAlign: 'center' },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.md },
  requestId: { ...typography.caption, color: colors.mutedText },
});
