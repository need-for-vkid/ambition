import React, { useCallback, useEffect, useMemo } from 'react';
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
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Minus,
  Cloud,
  Pencil,
} from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { CompletedTask, WorkType, DaySummary, Mood } from '../../types/task';
import { useT } from '../../lib/i18n';
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

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayHeader(iso: string, tr: (k: string) => string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date.toISOString()) === dayKey(today.toISOString())) return tr('history.today');
  if (dayKey(date.toISOString()) === dayKey(yesterday.toISOString())) return tr('history.yesterday');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const tr = useT();
  const { completed, daySummaries, loadCompleted, loadDaySummaries, restoreCompletedTask } = useTaskStore();

  useEffect(() => {
    loadCompleted();
    loadDaySummaries();
  }, [loadCompleted, loadDaySummaries]);

  const summaryByDate = useMemo(() => {
    const m = new Map<string, DaySummary>();
    for (const s of daySummaries) m.set(s.date, s);
    return m;
  }, [daySummaries]);

  const grouped = useMemo(() => {
    const map = new Map<string, CompletedTask[]>();
    for (const item of completed) {
      const key = dayKey(item.completedAt);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [completed]);

  const handleRestore = useCallback(
    async (id: string) => {
      impact(Haptics.ImpactFeedbackStyle.Medium);
      await restoreCompletedTask(id);
    },
    [restoreCompletedTask]
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={() => {
              impact();
              router.back();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={C.fgSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{tr('history.title')}</Text>
            <Text style={styles.title}>{tr('history.title')}</Text>
          </View>
          <View style={styles.totalBadge}>
            <CheckCircle2 size={12} color={C.gold400} />
            <Text style={styles.totalText}>{completed.length}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {completed.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{tr('history.empty')}</Text>
            </View>
          ) : (
            grouped.map((group, gIdx) => (
              <Animated.View
                key={group.key}
                entering={FadeIn.delay(gIdx * 40).duration(220)}
                layout={LinearTransition.springify().damping(20)}
              >
                <Text style={styles.dayHeader}>
                  {formatDayHeader(group.items[0].completedAt, tr)}
                </Text>
                {summaryByDate.has(group.key) && (
                  <View style={styles.summaryWrap}>
                    <DaySummaryCard
                      summary={summaryByDate.get(group.key)!}
                      onEdit={() => {
                        impact();
                        router.push({ pathname: '/(flow)/dayclose', params: { date: group.key } });
                      }}
                      tr={tr}
                    />
                  </View>
                )}
                <View style={styles.dayGroup}>
                  {group.items.map((item, i) => (
                    <Animated.View
                      key={item.id}
                      entering={FadeIn.delay(gIdx * 40 + i * 30).duration(220)}
                      layout={LinearTransition.springify().damping(20)}
                    >
                      <CompletedCard item={item} onRestore={() => handleRestore(item.id)} />
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const MOOD_ICONS: Record<Mood, React.FC<{ size: number; color: string }>> = {
  great: Sparkles,
  steady: Minus,
  heavy: Cloud,
};

interface SummaryCardProps {
  summary: DaySummary;
  onEdit: () => void;
  tr: (key: string) => string;
}

function DaySummaryCard({ summary, onEdit, tr }: SummaryCardProps) {
  const MoodIcon = summary.mood ? MOOD_ICONS[summary.mood] : null;
  const focusHrs = summary.focusMins > 0
    ? (summary.focusMins / 60).toFixed(1).replace('.0', '') + 'h'
    : '—';

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [styles.summaryCard, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={tr('history.edit_summary')}
    >
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryEyebrow}>{tr('history.day_summary')}</Text>
        <Pencil size={12} color={C.fgTertiary} />
      </View>
      <View style={styles.summaryStatsRow}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatValue}>{focusHrs}</Text>
          <Text style={styles.summaryStatLabel}>{tr('dayclose.focus_label')}</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatValue}>{summary.deepCount}</Text>
          <Text style={styles.summaryStatLabel}>{tr('dayclose.deep_label')}</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryStatValue}>{summary.tasksCompleted}</Text>
          <Text style={styles.summaryStatLabel}>{tr('dayclose.wins_label')}</Text>
        </View>
        {MoodIcon && summary.mood && (
          <View style={styles.summaryStat}>
            <MoodIcon size={18} color={C.gold400} />
            <Text style={styles.summaryStatLabel}>{tr(`dayclose.mood.${summary.mood}`)}</Text>
          </View>
        )}
      </View>
      {summary.note && (
        <Text style={styles.summaryNote}>"{summary.note}"</Text>
      )}
    </Pressable>
  );
}

interface CardProps {
  item: CompletedTask;
  onRestore: () => void;
}

function CompletedCard({ item, onRestore }: CardProps) {
  const { task, completedAt, pomosCount } = item;
  const WorkIcon = WORK_TYPE_ICONS[task.workType];
  const workColor = WORK_TYPE_COLORS[task.workType];

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: workColor }]} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {task.text}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaItem}>
            <WorkIcon size={10} color={C.fgTertiary} />
            <Text style={styles.cardMetaText}>{task.workType}</Text>
          </View>
          <Text style={styles.cardMetaSep}>·</Text>
          <Text style={styles.cardMetaText}>{formatTime(completedAt)}</Text>
          {pomosCount > 0 && (
            <>
              <Text style={styles.cardMetaSep}>·</Text>
              <Text style={styles.cardMetaText}>
                {pomosCount} pomo{pomosCount !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.restoreBtn, pressed && styles.restoreBtnPressed]}
        onPress={onRestore}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Restore task"
      >
        <RotateCcw size={14} color={C.fgSecondary} />
      </Pressable>
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
    alignItems: 'flex-end',
    paddingHorizontal: S[5],
    paddingTop: S[4],
    paddingBottom: S[4],
    gap: S[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.base700,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: C.base600,
  },
  eyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    letterSpacing: 1.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
    lineHeight: Size['3xl'] * 1.1,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201,162,39,0.10)',
    borderRadius: 20,
    paddingHorizontal: S[3],
    paddingVertical: S[1] + 2,
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  totalText: {
    fontFamily: Font.mono,
    fontSize: Size.xs,
    color: C.gold400,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: S[10],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: S[16],
    paddingHorizontal: S[5],
    gap: S[2],
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
  dayHeader: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: S[5],
    marginTop: S[5],
    marginBottom: S[2],
  },
  dayGroup: {
    paddingHorizontal: S[5],
    gap: S[2],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.base700,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDefault,
    overflow: 'hidden',
    paddingVertical: S[3],
    paddingRight: S[3],
    gap: S[2] + 2,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  cardAccent: {
    width: 3,
    alignSelf: 'stretch',
    opacity: 0.5,
  },
  cardContent: {
    flex: 1,
    gap: 3,
    paddingLeft: S[2],
  },
  cardTitle: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgSecondary,
    lineHeight: Size.sm * 1.4,
    textDecorationLine: 'line-through',
    textDecorationColor: C.fgTertiary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'capitalize',
  },
  cardMetaSep: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  restoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  restoreBtnPressed: {
    backgroundColor: C.base600,
  },
  summaryWrap: {
    paddingHorizontal: S[5],
    marginBottom: S[2],
  },
  summaryCard: {
    backgroundColor: 'rgba(201,162,39,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderGold,
    padding: S[4],
    gap: S[3],
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryEyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: S[3],
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  summaryStatValue: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.lg,
    color: C.fgPrimary,
    letterSpacing: 0.3,
  },
  summaryStatLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 10,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  summaryNote: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgSecondary,
    fontStyle: 'italic',
    lineHeight: Size.sm * 1.5,
  },
});
