import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { useT } from '../../lib/i18n';
import { C } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

export default function DoneScreen() {
  const router = useRouter();
  const tr = useT();
  const { dayPlan } = useTaskStore();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    impact(Haptics.ImpactFeedbackStyle.Heavy);
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withDelay(150, withSpring(1, { damping: 11, stiffness: 90 }));
    checkScale.value = withDelay(420, withSpring(1, { damping: 13, stiffness: 110 }));
    titleOpacity.value = withDelay(550, withTiming(1, { duration: 500 }));
    ctaOpacity.value = withDelay(950, withTiming(1, { duration: 400 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  const remaining = dayPlan?.plan.filter((b) => !b.task.blocked).length ?? 0;
  const nextTask = dayPlan?.plan.find((b) => !b.task.blocked);

  return (
    <View style={styles.root}>
      {/* Background gradient + golden halo */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="doneBg" cx="50%" cy="40%" r="80%">
            <Stop offset="0" stopColor={C.base700} stopOpacity="1" />
            <Stop offset="1" stopColor={C.base900} stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="halo" cx="50%" cy="42%" r="50%">
            <Stop offset="0" stopColor={C.gold500} stopOpacity="0.18" />
            <Stop offset="0.6" stopColor={C.gold500} stopOpacity="0.05" />
            <Stop offset="1" stopColor={C.gold500} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#doneBg)" />
        <Rect width="100%" height="100%" fill="url(#halo)" />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Animated ring + check */}
          <Animated.View style={[styles.ringContainer, ringStyle]}>
            <Svg width={180} height={180} viewBox="0 0 180 180">
              <Circle cx={90} cy={90} r={80} stroke={C.gold500} strokeWidth={2} fill="none" opacity={0.4} />
              <Circle cx={90} cy={90} r={62} stroke={C.gold400} strokeWidth={1.5} fill="none" opacity={0.6} />
            </Svg>
            <Animated.View style={[styles.checkCircle, checkStyle]}>
              <Check size={36} color={C.base900} strokeWidth={3} />
            </Animated.View>
          </Animated.View>

          {/* Message */}
          <Animated.View style={[styles.copy, titleStyle]}>
            <Text style={styles.headline}>{tr('done.headline')}</Text>
            <Text style={styles.subtext}>
              {remaining > 0
                ? `${remaining} ${remaining > 1 ? tr('done.remaining_plural') : tr('done.remaining_single')}`
                : tr('done.all_done')}
            </Text>
          </Animated.View>

          {/* Stats */}
          <Animated.View style={[styles.statsRow, titleStyle]}>
            <StatPill label={tr('done.focused')} value="25m" />
            <StatPill label={tr('done.segments')} value="1" />
          </Animated.View>

          {/* Actions */}
          <Animated.View style={[styles.actions, ctaStyle]}>
            {nextTask ? (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                onPress={() => {
                  impact();
                  router.replace('/(flow)/today');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>{tr('done.next_task')}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                onPress={() => {
                  impact();
                  router.replace('/(flow)/dump');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>{tr('done.new_day')}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Light);
                router.replace('/(flow)/today');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>{tr('done.back_to_plan')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.base900 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[6],
    gap: S[5],
  },
  ringContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.gold500,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.gold500,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  copy: {
    alignItems: 'center',
    gap: S[2],
  },
  headline: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: Size['3xl'] * 1.1,
  },
  subtext: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgSecondary,
    textAlign: 'center',
    lineHeight: Size.base * 1.5,
    paddingHorizontal: S[3],
  },
  statsRow: {
    flexDirection: 'row',
    gap: S[3],
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: C.base800,
    borderRadius: 14,
    paddingHorizontal: S[5],
    paddingVertical: S[3] + 2,
    borderWidth: 1,
    borderColor: C.borderDefault,
    minWidth: 100,
  },
  statValue: {
    fontFamily: Font.mono,
    fontSize: Size.xl,
    color: C.gold400,
  },
  statLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  actions: {
    width: '100%',
    gap: S[2] + 2,
    marginTop: S[3],
  },
  primaryBtn: {
    backgroundColor: C.gold500,
    borderRadius: 28,
    paddingVertical: S[4] + 2,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.gold500,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  primaryBtnPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.md,
    color: C.base900,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 28,
    paddingVertical: S[3] + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderDefault,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: C.base700,
  },
  secondaryBtnText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgSecondary,
  },
});
