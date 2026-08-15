import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';

export function ScreenContainer({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return <SafeAreaView edges={['top', 'bottom']} style={styles.safe}><View style={[styles.inner, style]} {...props}>{children}</View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, inner: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' } });
