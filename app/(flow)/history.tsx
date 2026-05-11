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
} from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { CompletedTask, WorkType } from '../../types/task';
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

function formatDayHeader(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date.toISOString()) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(date.toISOString()) === dayKey(yesterday.toISOString())) return 'Yesterday';
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
  const { completed, loadCompleted, restoreCompletedTask } = useTaskStore();

  useEffect(() => {
    loadCompleted();
  }, [loadCompleted]);

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
            <Text style={styles.eyebrow}>Archive</Text>
            <Text style={styles.title}>Completed</Text>
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
              <Text style={styles.emptyTitle}>Nothing completed yet.</Text>
              <Text style={styles.emptyText}>
                Tasks you finish will appear here.
              </Text>
            </View>
          ) : (
            grouped.map((group, gIdx) => (
              <Animated.View
                key={group.key}
                entering={FadeIn.delay(gIdx * 40).duration(220)}
                layout={LinearTransition.springify().damping(20)}
              >
                <Text style={styles.dayHeader}>
                  {formatDayHeader(group.items[0].completedAt)}
                </Text>
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
});
