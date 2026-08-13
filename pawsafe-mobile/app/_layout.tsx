import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalkFlowProvider } from '@/src/state/WalkFlowContext';
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
        <WalkFlowProvider>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'none' : 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="analyzing" />
            <Stack.Screen name="segments" />
            <Stack.Screen name="comparison" />
            <Stack.Screen name="live" />
            <Stack.Screen name="error" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </WalkFlowProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
