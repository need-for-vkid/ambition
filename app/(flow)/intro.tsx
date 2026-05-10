import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { C } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

export default function IntroScreen() {
  const router = useRouter();
  const haloScale = useSharedValue(0.85);
  const haloOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(0.95);

  useEffect(() => {
    haloOpacity.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) });
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 3500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.95, { duration: 3500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    ctaOpacity.value = withDelay(1400, withTiming(1, { duration: 500 }));
    ctaScale.value = withDelay(1400, withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const ctaWrapStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ scale: ctaScale.value }],
  }));

  const handleStart = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    router.replace('/(flow)/dump');
  };

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bgGrad" cx="50%" cy="40%" r="80%">
            <Stop offset="0" stopColor={C.base700} stopOpacity="1" />
            <Stop offset="1" stopColor={C.base900} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bgGrad)" />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Eyebrow */}
        <View style={styles.eyebrowWrap}>
          <Text style={styles.eyebrow}>AMBITION</Text>
        </View>

        {/* Center: halo + content */}
        <View style={styles.center}>
          <Animated.View style={[styles.haloWrap, haloStyle]}>
            <Svg width={260} height={260} viewBox="0 0 260 260">
              <Defs>
                <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0.30" stopColor={C.gold500} stopOpacity="0.55" />
                  <Stop offset="0.55" stopColor={C.gold500} stopOpacity="0.18" />
                  <Stop offset="1" stopColor={C.gold500} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="130" cy="130" r="130" fill="url(#halo)" />
              <Circle cx="130" cy="130" r="46" stroke={C.gold400} strokeWidth={1} fill="none" opacity={0.6} />
            </Svg>
          </Animated.View>

          <View style={styles.copy}>
            <Animated.Text style={[styles.title, titleStyle]}>
              Begin with chaos.
            </Animated.Text>
            <Animated.Text style={[styles.titleSecond, titleStyle]}>
              End with a clear day.
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, subtitleStyle]}>
              Drop every thought, plan, and worry.{'\n'}Let the algorithm shape it into focus.
            </Animated.Text>
          </View>
        </View>

        {/* CTA */}
        <Animated.View style={[styles.ctaWrap, ctaWrapStyle]}>
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Begin the dump"
          >
            <Text style={styles.ctaText}>Begin the dump</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.base800 },
  safe: { flex: 1, paddingHorizontal: S[5] },
  eyebrowWrap: {
    alignItems: 'center',
    paddingTop: S[4],
  },
  eyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[5],
  },
  haloWrap: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
    paddingHorizontal: S[4],
    gap: S[3],
  },
  title: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: Size['3xl'] * 1.15,
  },
  titleSecond: {
    fontFamily: Font.displayUpright,
    fontSize: Size.xl,
    color: C.fgSecondary,
    textAlign: 'center',
    lineHeight: Size.xl * 1.25,
  },
  subtitle: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
    textAlign: 'center',
    lineHeight: Size.sm * 1.6,
    marginTop: S[3],
    paddingHorizontal: S[4],
  },
  ctaWrap: {
    paddingBottom: S[4],
  },
  cta: {
    backgroundColor: C.gold500,
    borderRadius: 28,
    paddingVertical: S[4] + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  ctaPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.md,
    color: C.base900,
    letterSpacing: 0.3,
  },
});
