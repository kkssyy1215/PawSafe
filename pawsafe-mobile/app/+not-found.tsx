import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '@/src/components/common/AppButton';
import { ScreenContainer } from '@/src/components/common/ScreenContainer';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function NotFoundScreen() {
  return <ScreenContainer style={styles.container}><Text accessibilityRole="header" style={styles.title}>화면을 찾을 수 없습니다</Text><Text style={styles.description}>입력 화면으로 돌아가 산책 조건을 다시 선택해 주세요.</Text><AppButton onPress={() => router.replace('/')}>처음으로</AppButton></ScreenContainer>;
}
const styles = StyleSheet.create({ container: { justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md }, title: { ...typography.heading, color: colors.text }, description: { ...typography.body, color: colors.mutedText, textAlign: 'center' } });
