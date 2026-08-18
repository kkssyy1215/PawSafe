import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import type { WalkMode } from '@/src/api/contracts';
import { colors, spacing, typography } from '@/src/theme/theme';

type SmoothRouteLoaderProps = {
  walkMode: WalkMode;
  statusLabel: string;
  statusDescription: string;
};

export function SmoothRouteLoader({ walkMode, statusLabel, statusDescription }: SmoothRouteLoaderProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const copyOpacity = useRef(new Animated.Value(1)).current;
  const isFast = walkMode === 'fast';
  const accent = isFast ? colors.orange : colors.greenStrong;
  const soft = isFast ? colors.orangeSoft : colors.greenSoft;

  useEffect(() => {
    const rotationAnimation = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: 2_200,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    const pulseAnimation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1_150, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1_150, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]));
    const progressAnimation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 1_800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(progress, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));

    rotationAnimation.start();
    pulseAnimation.start();
    progressAnimation.start();
    return () => {
      rotationAnimation.stop();
      pulseAnimation.stop();
      progressAnimation.stop();
    };
  }, [progress, pulse, rotation]);

  useEffect(() => {
    copyOpacity.setValue(0.35);
    Animated.timing(copyOpacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [copyOpacity, statusDescription, statusLabel]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.18] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['18%', '94%'] });

  return (
    <View style={styles.container}>
      <View style={[styles.visual, { backgroundColor: soft }]}>
        <Animated.View style={[styles.pulseRing, { borderColor: accent, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
        <Animated.View style={[styles.orbit, { borderColor: accent, transform: [{ rotate: spin }] }]} />
        <View style={styles.logoCore}>
          <Image
            source={require('../../../../assets/brand/pawsafe-mark.png')}
            accessibilityLabel="온:길 안내견 이동 지원 서비스 로고"
            resizeMode="contain"
            style={[styles.logo, { tintColor: accent }]}
          />
        </View>
        <View style={styles.visualCaption}>
          <View style={[styles.liveDot, { backgroundColor: accent }]} />
          <Text style={styles.visualCaptionText}>{isFast ? '보행로 그래프 연결 중' : '실시간 데이터 결합 중'}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progress, { backgroundColor: accent, width: progressWidth }]} />
      </View>

      <Animated.View style={[styles.status, { borderColor: isFast ? '#EBD9B6' : '#CFE4D3', opacity: copyOpacity }]}>
        <View style={[styles.statusDot, { backgroundColor: accent }]} />
        <View style={styles.statusCopy}>
          <Text style={styles.statusLabel}>{statusLabel}</Text>
          <Text style={styles.statusDescription}>{statusDescription}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  visual: { height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24 },
  pulseRing: { position: 'absolute', width: 154, height: 154, borderWidth: 2, borderRadius: 77 },
  orbit: { position: 'absolute', width: 132, height: 132, borderWidth: 2, borderRightColor: 'transparent', borderBottomColor: 'transparent', borderRadius: 66 },
  logoCore: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 46, backgroundColor: colors.white },
  logo: { width: 58, height: 58 },
  visualCaption: { position: 'absolute', bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 11, paddingVertical: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  visualCaptionText: { ...typography.caption, color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: '#E2E6E1' },
  progress: { height: 6, borderRadius: 3 },
  status: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 17, backgroundColor: colors.surface, padding: spacing.md },
  statusDot: { width: 11, height: 11, borderWidth: 3, borderColor: colors.white, borderRadius: 6 },
  statusCopy: { flex: 1, gap: 2 },
  statusLabel: { ...typography.body, color: colors.text, fontWeight: '700' },
  statusDescription: { ...typography.caption, color: colors.mutedText },
});
