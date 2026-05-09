import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '../../store/tasks';
import { scheduleTasks } from '../../lib/scheduler';
import { C, WORK_TYPE_COLORS } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';
import { Task } from '../../types/task';

const MAX_CARDS = 8;
const PHASES = [
  'Reading your thoughts…',
  'Grouping by intent…',
  'Estimating effort…',
  'Composing your day.',
];

const JITTER_X = [-80, 60, -40, 90, -100, 55, -70, 80];
const JITTER_Y = [-60, -80, 70, -30, 50, 80, -90, 40];
const JITTER_R = [-8, 6, -4, 9, -6, 3, -10, 5];

// Individual card component to isolate hook usage
function FlyCard({ task, index, startX, startY, startR }: {
  task: Task;
  index: number;
  startX: number;
  startY: number;
  startR: number;
}) {
  const x = useSharedValue(startX);
  const y = useSharedValue(startY);
  const rot = useSharedValue(startR);
  const op = useSharedValue(0);

  useEffect(() => {
    const delay = index * 80;
    op.value = withDelay(delay, withTiming(1, { duration: 200 }));
    x.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 90 }));
    y.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 90 }));
    rot.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 90 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: op.value,
  }));

  const workColor = WORK_TYPE_COLORS[task.workType];

  return (
    <Animated.View style={[styles.flyCard, style]}>
      <View style={[styles.flyCardAccent, { backgroundColor: workColor }]} />
      <Text style={styles.flyCardText} numberOfLines={1}>{task.text}</Text>
    </Animated.View>
  );
}

export default function SortingScreen() {
  const router = useRouter();
  const { tasks, setDayPlan } = useTaskStore();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const progress = useSharedValue(0);

  const displayTasks = tasks.filter((t) => !t.blocked).slice(0, MAX_CARDS);

  useEffect(() => {
    const plan = scheduleTasks(tasks);
    setDayPlan(plan);

    progress.value = withTiming(1, { duration: 2800, easing: Easing.bezier(0.4, 0, 0.2, 1) });

    const phaseTimers = [0, 700, 1400, 2100].map((t, idx) =>
      setTimeout(() => setPhaseIdx(idx), t)
    );

    const navTimer = setTimeout(() => {
      router.replace('/(flow)/today');
    }, 3100);

    return () => {
      phaseTimers.forEach(clearTimeout);
      clearTimeout(navTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.aiDot} />
        <Text style={styles.headerLabel}>Composing your day</Text>
      </View>

      <View style={styles.cardsArea}>
        {displayTasks.map((task, i) => (
          <FlyCard
            key={task.id}
            task={task}
            index={i}
            startX={JITTER_X[i % JITTER_X.length]}
            startY={JITTER_Y[i % JITTER_Y.length]}
            startR={JITTER_R[i % JITTER_R.length]}
          />
        ))}
      </View>

      <Text style={styles.phase}>{PHASES[phaseIdx]}</Text>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, progressStyle]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.base900,
    paddingHorizontal: S[5],
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
    paddingTop: S[4],
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.gold500,
  },
  headerLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  cardsArea: {
    flex: 1,
    justifyContent: 'center',
    gap: S[2],
    paddingVertical: S[8],
  },
  flyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.base800,
    borderRadius: 10,
    padding: S[3],
    borderWidth: 1,
    borderColor: C.borderDefault,
    gap: S[2],
  },
  flyCardAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  flyCardText: {
    flex: 1,
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgPrimary,
  },
  phase: {
    fontFamily: Font.display,
    fontSize: Size.xl,
    color: C.fgSecondary,
    textAlign: 'center',
    paddingBottom: S[4],
  },
  progressTrack: {
    height: 3,
    backgroundColor: C.base700,
    borderRadius: 2,
    marginBottom: S[8],
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: C.gold500,
    borderRadius: 2,
  },
});
