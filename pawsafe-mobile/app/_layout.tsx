import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalkFlowProvider } from '@/src/state/WalkFlowContext';
import { VoiceAccessibilityProvider } from '@/src/features/accessibility/VoiceAccessibilityContext';
import { colors } from '@/src/theme/colors';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { void SplashScreen.hideAsync(); }, []);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <VoiceAccessibilityProvider>
          <WalkFlowProvider>
            <StatusBar style="dark" backgroundColor={colors.background} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'none' : 'slide_from_right' }}>
              <Stack.Screen name="index" options={{ title: '온:길' }} />
              <Stack.Screen name="analyzing" options={{ title: '온:길 · 경로 분석' }} />
              <Stack.Screen name="segments" options={{ title: '온:길 · 경로 상세' }} />
              <Stack.Screen name="comparison" options={{ title: '온:길 · 경로 비교' }} />
              <Stack.Screen name="live" options={{ title: '온:길 · 산책길 안내' }} />
              <Stack.Screen name="error" options={{ title: '온:길 · 안내' }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </WalkFlowProvider>
        </VoiceAccessibilityProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
