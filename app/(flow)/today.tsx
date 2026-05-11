import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Archive,
  Ban,
  ChevronRight,
  ChevronLeft,
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
  Sparkles,
  Utensils,
  RotateCcw,
  Plus,
  Settings,
} from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { ScheduledBlock, WorkType, Task } from '../../types/task';
import { planSummary } from '../../lib/scheduler';
import { useT } from '../../lib/i18n';
import { DayModePill } from '../../components/atoms/DayModePill';
import { AddToTodaySheet } from '../../components/AddToTodaySheet';
import { TaskEvalSheet } from '../../components/TaskEvalSheet';
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

function formatDate(tomorrow = false): string {
  const d = new Date();
  if (tomorrow) d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-US', {
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
  const tr = useT();
  const {
    tasks,
    dayPlan,
    dayMode,
    setDayMode,
    toggleBlockedAndReschedule,
    setFocusTask,
    planningTomorrow,
    setPlanningTomorrow,
    updateTaskFields,
    completed,
    daySummaries,
    loadCompleted,
  } = useTaskStore();

  useEffect(() => {
    loadCompleted();
  }, [loadCompleted]);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const plan = dayPlan?.plan ?? [];
  const deferred = dayPlan?.deferred ?? [];
  const summary = useMemo(
    () => (dayPlan ? planSummary(dayPlan, tasks, new Date(), dayMode) : null),
    [dayPlan, tasks, dayMode]
  );

  const taskBlocks = plan.filter((b) => b.kind !== 'lunch');
  const firstUnblocked = taskBlocks.find((b) => !b.task.blocked);

  // "Day complete" detection: any tasks finished today + nothing pending in plan.
  // We highlight Finish day when (a) the plan has no unblocked task left AND (b) at
  // least one task was completed today.
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayCompletedCount = completed.filter((c) => c.completedAt.slice(0, 10) === todayISO).length;
  const unblockedRemaining = taskBlocks.filter((b) => !b.task.blocked).length;
  const dayComplete = todayCompletedCount > 0 && unblockedRemaining === 0;

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
    if (!summary || taskBlocks.length === 0) {
      return 'No tasks scheduled. Head back to dump new thoughts.';
    }
    const deep = taskBlocks.filter((b) => b.task.workType === 'deep');
    const admin = taskBlocks.filter((b) => b.task.workType === 'admin');
    const morning = taskBlocks.filter((b) => parseInt(b.startTime, 10) < 12);

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
  }, [taskBlocks, summary]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
            onPress={() => {
              impact();
              router.push('/(flow)/dump');
            }}
            accessibilityRole="button"
            accessibilityLabel="Back to backlog"
          >
            <ChevronLeft size={18} color={C.fgTertiary} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: S[3] }}>
            <Text style={styles.dateLabel}>{formatDate(planningTomorrow)}</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{planningTomorrow ? 'Tomorrow' : 'Today'}</Text>
              <View style={styles.dayToggle}>
                <Pressable
                  style={[styles.dayToggleChip, !planningTomorrow && styles.dayToggleChipActive]}
                  onPress={() => { impact(); setPlanningTomorrow(false); }}
                >
                  <Text style={[styles.dayToggleText, !planningTomorrow && styles.dayToggleTextActive]}>{tr('task.deadline.today')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.dayToggleChip, planningTomorrow && styles.dayToggleChipActive]}
                  onPress={() => { impact(); setPlanningTomorrow(true); }}
                >
                  <Text style={[styles.dayToggleText, planningTomorrow && styles.dayToggleTextActive]}>{tr('task.deadline.tomorrow')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
              onPress={() => { impact(); router.push('/(flow)/settings'); }}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Settings size={16} color={C.fgTertiary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
              onPress={() => { impact(); router.push('/(flow)/history'); }}
              accessibilityRole="button"
              accessibilityLabel="Open archive"
            >
              <Archive size={16} color={C.fgTertiary} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: S[8] }}
        >
          {/* Day Mode pill */}
          <View style={styles.dayModeWrap}>
            <DayModePill value={dayMode} onChange={setDayMode} />
          </View>

          {/* AI summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Sparkles size={12} color={C.gold400} />
              <Text style={styles.summaryEyebrow}>{tr('today.ai_plan')}</Text>
            </View>
            <Text style={styles.summaryText}>{aiSummary}</Text>
            {summary && taskBlocks.length > 0 && (
              <Text style={styles.summaryMeta}>
                {summary.scheduledCount} {tr('today.on_the_plan')}
                {summary.deferredCount > 0 ? ` · ${summary.deferredCount} ${tr('today.deferred')}` : ''}
              </Text>
            )}
          </View>

          {/* Stats grid */}
          {summary && (
            <View style={styles.statsRow}>
              <Stat label={tr('today.tasks')} value={String(summary.totalTasks)} />
              <Stat
                label={tr('today.focus_label')}
                value={summary.totalFocusMins > 0 ? formatHours(summary.totalFocusMins) : '—'}
              />
              <Stat
                label={tr('today.of')}
                value={formatHours(summary.capacityMins)}
                subtle
              />
            </View>
          )}

          {/* Schedule header */}
          {plan.length > 0 && (
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleEyebrow}>{tr('today.schedule')}</Text>
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
              <Text style={styles.emptyTitle}>{tr('today.empty_title')}</Text>
              <Text style={styles.emptyText}>
                {tasks.length === 0
                  ? tr('today.empty_add_thoughts')
                  : tr('today.empty_all_blocked')}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBackBtn, pressed && styles.emptyBackBtnPressed]}
                onPress={() => {
                  impact();
                  router.replace('/(flow)/dump');
                }}
              >
                <Text style={styles.emptyBackBtnText}>{tr('today.back_to_dump')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.schedule}>
              {plan.map((block) => (
                <Animated.View
                  key={block.task.id + block.startTime}
                  layout={LinearTransition.springify().damping(18)}
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(180)}
                >
                  {block.kind === 'lunch' ? (
                    <LunchBlock startTime={block.startTime} duration={block.durationMins} />
                  ) : (
                    <ScheduleBlock
                      block={block}
                      isFirst={block === firstUnblocked}
                      onStart={() => handleStartTask(block)}
                      onEdit={() => {
                        impact();
                        setEditingTask(block.task);
                      }}
                      onToggleBlocked={() => handleToggleBlocked(block.task.id)}
                    />
                  )}
                </Animated.View>
              ))}
            </View>
          )}

          {/* Add to day */}
          {plan.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.addToDayBtn, pressed && styles.addToDayBtnPressed]}
              onPress={() => {
                impact();
                setAddSheetOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Add task to today"
            >
              <Plus size={16} color={C.gold400} />
              <Text style={styles.addToDayText}>{tr('today.add_to_today')}</Text>
            </Pressable>
          )}

          {/* Finish day button — always visible, highlighted when day is complete */}
          {!planningTomorrow && (
            <Pressable
              style={({ pressed }) => [
                styles.finishDayBtn,
                dayComplete ? styles.finishDayBtnReady : styles.finishDayBtnPending,
                pressed && styles.finishDayBtnPressed,
              ]}
              onPress={() => {
                impact(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(flow)/dayclose');
              }}
              accessibilityRole="button"
              accessibilityLabel={tr('today.finish_day')}
            >
              <Sparkles size={15} color={dayComplete ? C.base900 : C.fgTertiary} />
              <Text style={[
                styles.finishDayText,
                dayComplete ? styles.finishDayTextReady : styles.finishDayTextPending,
              ]}>
                {dayComplete ? tr('today.finish_day_ready') : tr('today.finish_day_pending')}
              </Text>
            </Pressable>
          )}

          {/* Deferred */}
          {deferred.length > 0 && (
            <View style={styles.deferred}>
              <Text style={styles.deferredLabel}>{tr('today.didnt_fit')}</Text>
              {deferred.map((task) => (
                <View key={task.id} style={styles.deferredItem}>
                  <View style={[styles.deferredDot, { backgroundColor: WORK_TYPE_COLORS[task.workType] }]} />
                  <Text style={styles.deferredText}>{task.text}</Text>
                  {task.carryOverCount && task.carryOverCount > 0 ? (
                    <View style={styles.carryBadge}>
                      <RotateCcw size={9} color={C.fgTertiary} />
                      <Text style={styles.carryBadgeText}>{task.carryOverCount}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {addSheetOpen && (
        <AddToTodaySheet onClose={() => setAddSheetOpen(false)} />
      )}

      {editingTask && (
        <TaskEvalSheet
          pendingText=""
          existingTask={editingTask}
          onUpdate={(updated) => {
            updateTaskFields(updated);
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
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
  onEdit: () => void;
  onToggleBlocked: () => void;
}

function ScheduleBlock({ block, isFirst, onStart, onEdit, onToggleBlocked }: BlockProps) {
  const { task, startTime, durationMins } = block;
  const WorkIcon = WORK_TYPE_ICONS[task.workType];
  const workColor = WORK_TYPE_COLORS[task.workType];
  const tr = useT();

  const h = Math.floor(durationMins / 60);
  const m = durationMins % 60;
  const durStr = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;

  return (
    <View
      style={[
        styles.block,
        isFirst && !task.blocked && styles.blockFirst,
      ]}
    >
      {/* Time accent bar */}
      <View style={[styles.blockAccent, { backgroundColor: workColor }]} />

      {/* Time column */}
      <View style={styles.blockTimeCol}>
        <Text style={[styles.blockTime, isFirst && styles.blockTimeFirst]}>
          {startTime}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.blockContent, pressed && { opacity: 0.7 }]}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit task"
      >
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
          {task.carryOverCount && task.carryOverCount > 0 ? (
            <>
              <Text style={styles.blockMetaSep}>·</Text>
              <View style={styles.carryInline}>
                <RotateCcw size={9} color={C.fgTertiary} />
                <Text style={styles.carryInlineText}>
                  {task.carryOverCount === 1 ? tr('today.from_yesterday') : `${tr('today.deferred_x')} ${task.carryOverCount}×`}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.blockRight}>
        {isFirst && !task.blocked ? (
          <View style={styles.firstTaskActions}>
            <Pressable
              style={({ pressed }) => [styles.banBtnSmall, pressed && styles.banBtnPressed]}
              onPress={onToggleBlocked}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Skip this task"
            >
              <Ban size={13} color={C.fgTertiary} />
            </Pressable>
            <Pressable style={styles.startBadge} onPress={onStart}>
              <Text style={styles.startText}>{tr('today.start')}</Text>
              <ChevronRight size={14} color={C.gold400} />
            </Pressable>
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
    </View>
  );
}

function LunchBlock({ startTime, duration }: { startTime: string; duration: number }) {
  const tr = useT();
  return (
    <View style={styles.lunchBlock}>
      <View style={styles.lunchTimeCol}>
        <Text style={styles.lunchTime}>{startTime}</Text>
      </View>
      <View style={styles.lunchContent}>
        <Utensils size={13} color={C.fgTertiary} />
        <Text style={styles.lunchText}>{tr('today.lunch')}</Text>
        <Text style={styles.lunchDuration}>{duration}m</Text>
      </View>
    </View>
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
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingTop: S[4],
    paddingBottom: S[3],
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.base700,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnPressed: {
    backgroundColor: C.base600,
  },
  headerActions: {
    flexDirection: 'row',
    gap: S[2],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    flexWrap: 'wrap',
  },
  dayToggle: {
    flexDirection: 'row',
    backgroundColor: C.base700,
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  dayToggleChip: {
    paddingHorizontal: S[3],
    paddingVertical: 4,
    borderRadius: 18,
  },
  dayToggleChipActive: {
    backgroundColor: C.gold500,
  },
  dayToggleText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    letterSpacing: 0.3,
  },
  dayToggleTextActive: {
    color: C.base900,
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
    fontSize: Size['2xl'],
    color: C.fgPrimary,
    lineHeight: Size['2xl'] * 1.1,
  },
  scroll: {
    flex: 1,
  },
  dayModeWrap: {
    paddingHorizontal: S[5],
    marginBottom: S[3],
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
    flexWrap: 'wrap',
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
  carryInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  carryInlineText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    fontStyle: 'italic',
  },
  blockRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  firstTaskActions: {
    alignItems: 'flex-end',
    gap: 4,
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
  banBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  banBtnPressed: {
    backgroundColor: C.base600,
  },
  lunchBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderStyle: 'dashed',
    paddingVertical: S[2] + 2,
    paddingHorizontal: S[2],
    gap: S[2] + 2,
    minHeight: 40,
  },
  lunchTimeCol: {
    width: 40,
    alignItems: 'center',
  },
  lunchTime: {
    fontFamily: Font.mono,
    fontSize: Size.xs,
    color: C.fgTertiary,
    letterSpacing: 0.5,
  },
  lunchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
  },
  lunchText: {
    flex: 1,
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
    fontStyle: 'italic',
  },
  lunchDuration: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
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
  emptyBackBtn: {
    backgroundColor: C.gold500,
    borderRadius: 14,
    paddingHorizontal: S[6],
    paddingVertical: S[3] + 2,
    marginTop: S[2],
    minHeight: 48,
    justifyContent: 'center',
  },
  emptyBackBtnPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.98 }],
  },
  emptyBackBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.base900,
  },
  addToDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    marginHorizontal: S[5],
    marginTop: S[5],
    paddingVertical: S[3] + 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderGold,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  addToDayBtnPressed: {
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  addToDayText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.gold400,
    letterSpacing: 0.3,
  },
  finishDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    marginHorizontal: S[5],
    marginTop: S[3],
    paddingVertical: S[3] + 2,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
  },
  finishDayBtnPending: {
    borderColor: C.borderSubtle,
    backgroundColor: 'transparent',
  },
  finishDayBtnReady: {
    borderColor: C.gold500,
    backgroundColor: C.gold500,
  },
  finishDayBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  finishDayText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    letterSpacing: 0.5,
  },
  finishDayTextPending: {
    color: C.fgTertiary,
  },
  finishDayTextReady: {
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
  carryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: C.base600,
    borderRadius: 6,
  },
  carryBadgeText: {
    fontFamily: Font.mono,
    fontSize: 10,
    color: C.fgTertiary,
  },
});
