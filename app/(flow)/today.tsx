import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Bell,
  Ban,
  ChevronRight,
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
  Sparkles,
  RotateCcw,
} from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { ScheduledBlock, WorkType } from '../../types/task';
import { planSummary } from '../../lib/scheduler';
import { C, WORK_TYPE_COLORS } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

const WORK_TYPE_ICONS: Record<WorkType, React.FC<{ size: number; color: string }>> = {
  deep: Brain,
  learning: BookOpen,
  social: Users,
  body: Dumbbell,
  admin: ClipboardList,
};

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();
}

function formatHours(mins: number): string {
  const h = mins / 60;
  if (h === Math.floor(h)) return `${h}.0h`;
  return `${h.toFixed(1)}h`;
}

export default function TodayScreen() {
  const router = useRouter();
  const { tasks, dayPlan, toggleBlockedAndReschedule, setFocusTask } = useTaskStore();

  const plan = dayPlan?.plan ?? [];
  const deferred = dayPlan?.deferred ?? [];
  const summary = useMemo(
    () => (dayPlan ? planSummary(dayPlan, tasks) : null),
    [dayPlan, tasks]
  );

  const firstUnblocked = plan.find((b) => !b.task.blocked);

  const handleStartTask = useCallback(
    (block: ScheduledBlock) => {
      impact(Haptics.ImpactFeedbackStyle.Medium);
      setFocusTask(block);
      router.push('/(flow)/focus');
    },
    [setFocusTask, router]
  );

  const handleToggleBlocked = useCallback(
    (id: string) => {
      impact();
      toggleBlockedAndReschedule(id);
    },
    [toggleBlockedAndReschedule]
  );

  const aiSummary = useMemo(() => {
    if (!summary || plan.length === 0) {
      return 'No tasks scheduled. Head back to dump new thoughts.';
    }
    const deep = plan.filter((b) => b.task.workType === 'deep');
    const social = plan.filter((b) => b.task.workType === 'social');
    const admin = plan.filter((b) => b.task.workType === 'admin');
    const morning = plan.filter((b) => parseInt(b.startTime, 10) < 12);

    if (summary.criticalCount > 0) {
      return `${summary.criticalCount} urgent task${summary.criticalCount > 1 ? 's' : ''} today. Lead with the most pressing.`;
    }
    if (deep.length >= 2 && morning.length >= 2) {
      return 'Two deep blocks before lunch. Routines tucked in the gaps.';
    }
    if (deep.length > 0 && admin.length > 0) {
      return `${deep.length} deep block${deep.length > 1 ? 's' : ''}, then ${admin.length} admin task${admin.length > 1 ? 's' : ''} to clear the backlog.`;
    }
    return "A balanced day. Trust the order — it's already optimal.";
  }, [plan, summary]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>{formatDate()}</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.bellBtn, pressed && styles.bellBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={18} color={C.fgSecondary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: S[8] }}
        >
          {/* AI summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Sparkles size={12} color={C.gold400} />
              <Text style={styles.summaryEyebrow}>AI plan</Text>
            </View>
            <Text style={styles.summaryText}>{aiSummary}</Text>
            {summary && plan.length > 0 && (
              <Text style={styles.summaryMeta}>
                {summary.scheduledCount} on the plan
                {summary.deferredCount > 0 ? ` · ${summary.deferredCount} deferred` : ''}
              </Text>
            )}
          </View>

          {/* Stats grid */}
          {summary && (
            <View style={styles.statsRow}>
              <Stat label="TASKS" value={String(summary.totalTasks)} />
              <Stat label="FOCUS" value={summary.totalFocusMins > 0 ? formatHours(summary.totalFocusMins) : '—'} />
              <Stat
                label={`OF ${summary.totalTasks}`}
                value="0"
                subtle
              />
            </View>
          )}

          {/* Schedule header */}
          {plan.length > 0 && (
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleEyebrow}>Schedule</Text>
              {summary && summary.totalFocusMins > 0 && (
                <Text style={styles.scheduleHeaderRight}>
                  {formatHours(summary.totalFocusMins)} focus
                </Text>
              )}
            </View>
          )}

          {/* Schedule */}
          {plan.length === 0 ? (
            <View style={styles.emptyPlan}>
              <Text style={styles.emptyTitle}>The day is clear.</Text>
              <Text style={styles.emptyText}>
                {tasks.length === 0
                  ? 'Add some thoughts to begin.'
                  : 'All tasks blocked or completed.'}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
                onPress={() => {
                  impact();
                  router.replace('/(flow)/dump');
                }}
              >
                <Text style={styles.backBtnText}>Back to dump</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.schedule}>
              {plan.map((block) => (
                <Animated.View
                  key={block.task.id}
                  layout={LinearTransition.springify().damping(18)}
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(180)}
                >
                  <ScheduleBlock
                    block={block}
                    isFirst={block === firstUnblocked}
                    onStart={() => handleStartTask(block)}
                    onToggleBlocked={() => handleToggleBlocked(block.task.id)}
                  />
                </Animated.View>
              ))}
            </View>
          )}

          {/* Deferred */}
          {deferred.length > 0 && (
            <View style={styles.deferred}>
              <Text style={styles.deferredLabel}>Didn't fit today</Text>
              {deferred.map((task) => (
                <View key={task.id} style={styles.deferredItem}>
                  <View style={[styles.deferredDot, { backgroundColor: WORK_TYPE_COLORS[task.workType] }]} />
                  <Text style={styles.deferredText}>{task.text}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface StatProps {
  label: string;
  value: string;
  subtle?: boolean;
}

function Stat({ label, value, subtle }: StatProps) {
  return (
    <View style={[styles.stat, subtle && styles.statSubtle]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface BlockProps {
  block: ScheduledBlock;
  isFirst: boolean;
  onStart: () => void;
  onToggleBlocked: () => void;
}

function ScheduleBlock({ block, isFirst, onStart, onToggleBlocked }: BlockProps) {
  const { task, startTime, durationMins } = block;
  const WorkIcon = WORK_TYPE_ICONS[task.workType];
  const workColor = WORK_TYPE_COLORS[task.workType];

  const h = Math.floor(durationMins / 60);
  const m = durationMins % 60;
  const durStr = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.block,
        isFirst && !task.blocked && styles.blockFirst,
        pressed && isFirst && !task.blocked && styles.blockPressed,
      ]}
      onPress={isFirst && !task.blocked ? onStart : undefined}
    >
      {/* Time accent bar */}
      <View style={[styles.blockAccent, { backgroundColor: workColor }]} />

      {/* Time column */}
      <View style={styles.blockTimeCol}>
        <Text style={[styles.blockTime, isFirst && styles.blockTimeFirst]}>
          {startTime}
        </Text>
      </View>

      <View style={styles.blockContent}>
        <Text style={styles.blockTitle} numberOfLines={2}>
          {task.text}
        </Text>
        <View style={styles.blockMetaRow}>
          <View style={styles.blockTypeBadge}>
            <WorkIcon size={10} color={C.fgTertiary} />
            <Text style={styles.blockTypeText}>{task.workType}</Text>
          </View>
          <Text style={styles.blockMetaSep}>·</Text>
          <Text style={styles.blockDuration}>{durStr}</Text>
        </View>
      </View>

      <View style={styles.blockRight}>
        {isFirst && !task.blocked ? (
          <View style={styles.startBadge}>
            <Text style={styles.startText}>Start</Text>
            <ChevronRight size={14} color={C.gold400} />
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.banBtn, pressed && styles.banBtnPressed]}
            onPress={onToggleBlocked}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Skip this task"
          >
            <Ban size={15} color={C.fgTertiary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.base800,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: S[5],
    paddingTop: S[4],
    paddingBottom: S[4],
  },
  dateLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  title: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
    lineHeight: Size['3xl'] * 1.1,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.base700,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtnPressed: {
    backgroundColor: C.base600,
  },
  scroll: {
    flex: 1,
  },
  summaryCard: {
    marginHorizontal: S[5],
    marginBottom: S[4],
    backgroundColor: 'rgba(201,162,39,0.07)',
    borderWidth: 1,
    borderColor: C.borderGold,
    borderRadius: 14,
    padding: S[4],
    gap: S[2],
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryEyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  summaryText: {
    fontFamily: Font.display,
    fontSize: Size.lg,
    color: C.fgPrimary,
    lineHeight: Size.lg * 1.35,
  },
  summaryMeta: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: S[5],
    marginBottom: S[5],
    gap: S[2],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.base700,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDefault,
    paddingVertical: S[3] + 2,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  statSubtle: {
    backgroundColor: C.base800,
  },
  statValue: {
    fontFamily: Font.mono,
    fontSize: Size.xl,
    color: C.fgPrimary,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 9,
    color: C.fgTertiary,
    letterSpacing: 1.5,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S[5],
    marginBottom: S[3],
  },
  scheduleEyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  scheduleHeaderRight: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  schedule: {
    paddingHorizontal: S[5],
    gap: S[2] + 2,
  },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.base700,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderDefault,
    overflow: 'hidden',
    paddingVertical: S[3] + 2,
    paddingRight: S[3],
    gap: S[2] + 2,
    minHeight: 64,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  blockFirst: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  blockPressed: {
    backgroundColor: 'rgba(201,162,39,0.14)',
    transform: [{ scale: 0.99 }],
  },
  blockAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  blockTimeCol: {
    width: 40,
    alignItems: 'center',
  },
  blockTime: {
    fontFamily: Font.mono,
    fontSize: Size.xs,
    color: C.fgTertiary,
    letterSpacing: 0.5,
  },
  blockTimeFirst: {
    color: C.gold400,
  },
  blockContent: {
    flex: 1,
    gap: 4,
  },
  blockTitle: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.fgPrimary,
    lineHeight: Size.base * 1.35,
  },
  blockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  blockTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  blockTypeText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'capitalize',
  },
  blockMetaSep: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  blockDuration: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  blockRight: {
    minWidth: 56,
    alignItems: 'flex-end',
  },
  startBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: S[2] + 2,
    paddingVertical: 6,
  },
  startText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.gold400,
    letterSpacing: 0.5,
  },
  banBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  banBtnPressed: {
    backgroundColor: C.base600,
  },
  emptyPlan: {
    alignItems: 'center',
    paddingVertical: S[12],
    paddingHorizontal: S[5],
    gap: S[3],
  },
  emptyTitle: {
    fontFamily: Font.display,
    fontSize: Size.xl,
    color: C.fgSecondary,
  },
  emptyText: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: C.gold500,
    borderRadius: 14,
    paddingHorizontal: S[6],
    paddingVertical: S[3] + 2,
    marginTop: S[2],
    minHeight: 48,
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.98 }],
  },
  backBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.base900,
  },
  deferred: {
    marginHorizontal: S[5],
    marginTop: S[5],
    backgroundColor: C.base700,
    borderRadius: 12,
    padding: S[4],
    borderWidth: 1,
    borderColor: C.borderDefault,
    gap: S[2],
  },
  deferredLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: S[1],
  },
  deferredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2] + 2,
  },
  deferredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deferredText: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
    flex: 1,
  },
});
