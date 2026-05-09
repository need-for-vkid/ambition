import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  Ban,
  ChevronRight,
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
} from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { ScheduledBlock, WorkType } from '../../types/task';
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

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function totalFocusHours(plan: ScheduledBlock[]): string {
  const total = plan.reduce((acc, b) => acc + b.durationMins, 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TodayScreen() {
  const router = useRouter();
  const { dayPlan, toggleBlocked, setFocusTask } = useTaskStore();

  const plan = dayPlan?.plan ?? [];
  const deferred = dayPlan?.deferred ?? [];
  const blocked = plan.filter((b) => b.task.blocked);

  const handleStartTask = useCallback(
    (block: ScheduledBlock) => {
      setFocusTask(block);
      router.push('/(flow)/focus');
    },
    [setFocusTask, router]
  );

  const firstUnblocked = plan.find((b) => !b.task.blocked);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{formatDate()}</Text>
          <Text style={styles.title}>Today</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Bell size={20} color={C.fgTertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* AI summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryDot} />
          <Text style={styles.summaryText}>
            {plan.length > 0
              ? generateSummary(plan)
              : 'No tasks scheduled. Head back to dump new thoughts.'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Tasks" value={String(plan.length)} />
          <View style={styles.statDivider} />
          <Stat label="Focus" value={plan.length > 0 ? totalFocusHours(plan) : '—'} />
          <View style={styles.statDivider} />
          <Stat label="Blocked" value={String(blocked.length)} />
        </View>

        {/* Schedule */}
        {plan.length === 0 ? (
          <View style={styles.emptyPlan}>
            <Text style={styles.emptyText}>No tasks in today's plan yet.</Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(flow)/dump')}
              activeOpacity={0.8}
            >
              <Text style={styles.backBtnText}>Back to dump</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.schedule}>
            {plan.map((block, i) => (
              <ScheduleBlock
                key={block.task.id}
                block={block}
                isFirst={block === firstUnblocked}
                onStart={() => handleStartTask(block)}
                onToggleBlocked={() => toggleBlocked(block.task.id)}
              />
            ))}
          </View>
        )}

        {/* Deferred */}
        {deferred.length > 0 && (
          <View style={styles.deferred}>
            <Text style={styles.deferredLabel}>Didn't fit today</Text>
            {deferred.map((task) => (
              <Text key={task.id} style={styles.deferredItem}>· {task.text}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function generateSummary(plan: ScheduledBlock[]): string {
  const deep = plan.filter((b) => b.task.workType === 'deep');
  const social = plan.filter((b) => b.task.workType === 'social');
  const admin = plan.filter((b) => b.task.workType === 'admin');

  const parts: string[] = [];
  if (deep.length > 0) parts.push(`${deep.length} deep block${deep.length > 1 ? 's' : ''}`);
  if (social.length > 0) parts.push(`${social.length} meeting${social.length > 1 ? 's' : ''}`);
  if (admin.length > 0) parts.push(`${admin.length} admin task${admin.length > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') + ' — stay focused.' : 'A balanced day ahead.';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
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
    <TouchableOpacity
      style={[
        styles.block,
        task.blocked && styles.blockBlocked,
        isFirst && !task.blocked && styles.blockFirst,
      ]}
      onPress={isFirst && !task.blocked ? onStart : undefined}
      activeOpacity={isFirst ? 0.85 : 1}
    >
      {/* Time accent bar */}
      <View style={[styles.blockAccent, { backgroundColor: workColor }]} />

      <View style={styles.blockContent}>
        <View style={styles.blockRow}>
          <Text style={styles.blockTime}>{startTime}</Text>
          <View style={[styles.blockTypeBadge, { backgroundColor: `${workColor}22` }]}>
            <WorkIcon size={11} color={workColor} />
            <Text style={[styles.blockTypeText, { color: workColor }]}>{task.workType}</Text>
          </View>
          <Text style={styles.blockDuration}>{durStr}</Text>
        </View>
        <Text
          style={[styles.blockTitle, task.blocked && styles.blockTitleBlocked]}
          numberOfLines={2}
        >
          {task.text}
        </Text>

        {isFirst && !task.blocked && (
          <View style={styles.startRow}>
            <Text style={styles.startText}>Start</Text>
            <ChevronRight size={14} color={C.gold400} />
          </View>
        )}
      </View>

      {/* Blocked toggle */}
      <TouchableOpacity
        style={[styles.banBtn, task.blocked && styles.banBtnActive]}
        onPress={onToggleBlocked}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ban size={14} color={task.blocked ? C.fgSecondary : C.fgTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.base800,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: S[5],
    paddingTop: S[4],
    paddingBottom: S[3],
  },
  dateLabel: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginBottom: 2,
  },
  title: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
  },
  bellBtn: {
    padding: S[2],
  },
  scroll: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[3],
    marginHorizontal: S[5],
    marginBottom: S[4],
    backgroundColor: 'rgba(201,162,39,0.08)',
    borderWidth: 1,
    borderColor: C.borderGold,
    borderRadius: 12,
    padding: S[4],
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold500,
    marginTop: 3,
    flexShrink: 0,
  },
  summaryText: {
    flex: 1,
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: S[5],
    marginBottom: S[5],
    backgroundColor: C.base700,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDefault,
    padding: S[4],
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: Font.displayUpright,
    fontSize: Size.xl,
    color: C.fgPrimary,
  },
  statLabel: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.borderDefault,
  },
  schedule: {
    paddingHorizontal: S[5],
    gap: S[3],
    paddingBottom: S[5],
  },
  block: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: C.base700,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDefault,
    overflow: 'hidden',
  },
  blockFirst: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.07)',
  },
  blockBlocked: {
    opacity: 0.4,
  },
  blockAccent: {
    width: 4,
  },
  blockContent: {
    flex: 1,
    padding: S[3],
    gap: S[1],
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
  },
  blockTime: {
    fontFamily: Font.mono,
    fontSize: Size.xs,
    color: C.fgTertiary,
    minWidth: 38,
  },
  blockTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockTypeText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
  },
  blockDuration: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginLeft: 'auto',
  },
  blockTitle: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.fgPrimary,
    lineHeight: 22,
  },
  blockTitleBlocked: {
    textDecorationLine: 'line-through',
    color: C.fgTertiary,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: S[1],
  },
  startText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.gold400,
  },
  banBtn: {
    padding: S[3],
    justifyContent: 'center',
  },
  banBtnActive: {
    backgroundColor: C.base600,
  },
  emptyPlan: {
    alignItems: 'center',
    paddingVertical: S[12],
    gap: S[4],
  },
  emptyText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgTertiary,
  },
  backBtn: {
    backgroundColor: C.gold500,
    borderRadius: 12,
    paddingHorizontal: S[6],
    paddingVertical: S[3],
  },
  backBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.base900,
  },
  deferred: {
    marginHorizontal: S[5],
    marginBottom: S[6],
    backgroundColor: C.base700,
    borderRadius: 12,
    padding: S[4],
    borderWidth: 1,
    borderColor: C.borderDefault,
    gap: S[1],
  },
  deferredLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: S[1],
  },
  deferredItem: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
  },
});
