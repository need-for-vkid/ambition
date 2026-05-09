import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Check } from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { C } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

export default function DoneScreen() {
  const router = useRouter();
  const { dayPlan } = useTaskStore();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 80 }));
    checkScale.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 100 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const nextTask = dayPlan?.plan.find((b) => !b.task.blocked);
  const remaining = dayPlan?.plan.length ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Halo glow */}
      <View style={styles.haloWrapper}>
        <View style={styles.halo} />
      </View>

      <View style={styles.content}>
        {/* Animated ring + check */}
        <Animated.View style={[styles.ringContainer, ringStyle]}>
          <Svg width={160} height={160} viewBox="0 0 160 160">
            <Circle cx={80} cy={80} r={70} stroke={C.gold500} strokeWidth={3} fill="none" opacity={0.3} />
            <Circle cx={80} cy={80} r={55} stroke={C.gold400} strokeWidth={2} fill="none" opacity={0.5} />
          </Svg>
          <Animated.View style={[styles.checkCircle, checkStyle]}>
            <Check size={32} color={C.base900} strokeWidth={3} />
          </Animated.View>
        </Animated.View>

        {/* Message */}
        <Text style={styles.headline}>Task done.</Text>
        <Text style={styles.subtext}>
          {remaining > 0
            ? `${remaining} task${remaining > 1 ? 's' : ''} still in today's plan.`
            : "That's everything for today."}
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatPill label="Focused" value="25m" />
          <StatPill label="Segments" value="1" />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {nextTask ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/(flow)/today')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Next task</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/(flow)/dump')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>New day</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(flow)/today')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Back to plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  root: {
    flex: 1,
    backgroundColor: C.base900,
  },
  haloWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(201,162,39,0.06)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[6],
    gap: S[5],
  },
  ringContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.gold500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: S[3],
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: C.base800,
    borderRadius: 12,
    paddingHorizontal: S[5],
    paddingVertical: S[3],
    borderWidth: 1,
    borderColor: C.borderDefault,
    minWidth: 90,
  },
  statValue: {
    fontFamily: Font.displayUpright,
    fontSize: Size.xl,
    color: C.gold400,
  },
  statLabel: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginTop: 2,
  },
  actions: {
    width: '100%',
    gap: S[3],
  },
  primaryBtn: {
    backgroundColor: C.gold500,
    borderRadius: 16,
    paddingVertical: S[4],
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.md,
    color: C.base900,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: S[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderDefault,
  },
  secondaryBtnText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgSecondary,
  },
});
