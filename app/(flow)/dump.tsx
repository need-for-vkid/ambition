import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ArrowUp,
  Ban,
  X,
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
  Calendar,
  Clock,
  ChevronRight,
  SortDesc,
  Settings,
} from 'lucide-react-native';
import { TaskEvalSheet } from '../../components/TaskEvalSheet';
import { PriorityDot } from '../../components/atoms/PriorityDot';
import { useTaskStore } from '../../store/tasks';
import { selectionScore } from '../../lib/scheduler';
import { useT } from '../../lib/i18n';
import { Task, WorkType } from '../../types/task';
import { C, WORK_TYPE_COLORS } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

const JITTER: number[] = [-1.6, 1.1, -0.7, 1.8, -1.4, 0.6, -1.9, 0.9, -0.4, 1.5];

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

export default function DumpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tr = useT();
  const { tasks, addTask, removeTask, toggleBlocked, recomputePlan } = useTaskStore();
  const [inputText, setInputText] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sortMode, setSortMode] = useState<'default' | 'priority'>('default');

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const unblocked = tasks.filter((t) => !t.blocked);
  const blockedCount = tasks.filter((t) => t.blocked).length;
  const canSort = unblocked.length >= 2;

  const displayedTasks = useMemo(() => {
    if (sortMode === 'priority') {
      const now = new Date();
      return [...tasks].sort((a, b) => selectionScore(b, now) - selectionScore(a, now));
    }
    return tasks;
  }, [tasks, sortMode]);

  const handleSubmitText = useCallback(() => {
    if (!inputText.trim()) return;
    impact(Haptics.ImpactFeedbackStyle.Medium);
    setSheetOpen(true);
  }, [inputText]);

  const handleAddTask = useCallback(
    (task: Task) => {
      addTask(task);
      impact(Haptics.ImpactFeedbackStyle.Light);
      setInputText('');
      setSheetOpen(false);
    },
    [addTask]
  );

  const handleSort = useCallback(() => {
    impact(Haptics.ImpactFeedbackStyle.Heavy);
    recomputePlan();
    router.replace('/(flow)/today');
  }, [recomputePlan, router]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>{tr('dump.eyebrow')}</Text>
            <Text style={styles.headerTitle}>{tr('dump.title')}</Text>
          </View>
          <View style={styles.headerRight}>
            {blockedCount > 0 && (
              <Animated.View entering={FadeIn} style={styles.blockedBadge}>
                <Ban size={12} color={C.fgTertiary} />
                <Text style={styles.blockedBadgeText}>{blockedCount}</Text>
              </Animated.View>
            )}
            {tasks.length >= 2 && (
              <Pressable
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  sortMode === 'priority' && styles.headerIconBtnActive,
                  pressed && styles.headerIconBtnPressed,
                ]}
                onPress={() => {
                  impact();
                  setSortMode((m) => (m === 'default' ? 'priority' : 'default'));
                }}
                accessibilityRole="button"
                accessibilityLabel="Toggle priority sort"
              >
                <SortDesc size={16} color={sortMode === 'priority' ? C.gold400 : C.fgTertiary} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconBtnPressed]}
              onPress={() => router.push('/(flow)/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Settings size={16} color={C.fgTertiary} />
            </Pressable>
          </View>
        </View>

        {/* Task list */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: canSort ? 140 : 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tasks.length === 0 && (
            <Animated.View entering={FadeIn.delay(150)} style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{tr('dump.empty_title')}</Text>
              <Text style={styles.emptyText}>{tr('dump.empty_text')}</Text>
            </Animated.View>
          )}
          {sortMode === 'priority' && tasks.length >= 2 && (
            <Animated.View entering={FadeIn} style={styles.sortModeLabel}>
              <SortDesc size={11} color={C.gold400} />
              <Text style={styles.sortModeLabelText}>{tr('dump.sorted_by_priority')}</Text>
            </Animated.View>
          )}
          {displayedTasks.map((task, i) => (
            <Animated.View
              key={task.id}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(180)}
              layout={LinearTransition.springify().damping(18)}
            >
              <TaskCard
                task={task}
                jitter={sortMode === 'priority' ? 0 : JITTER[i % JITTER.length]}
                rank={sortMode === 'priority' && !task.blocked ? i + 1 : undefined}
                onRemove={() => {
                  impact();
                  removeTask(task.id);
                }}
                onToggleBlocked={() => {
                  impact();
                  toggleBlocked(task.id);
                }}
              />
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Sort CTA — floats above input bar (hidden while keyboard up) */}
      {canSort && keyboardHeight === 0 && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.sortCTAWrapper, { bottom: 76 + insets.bottom }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={({ pressed }) => [styles.sortCTA, pressed && styles.sortCTAPressed]}
            onPress={handleSort}
            accessibilityRole="button"
          >
            <Text style={styles.sortCTAText}>{tr('dump.sort_cta')}</Text>
            <ChevronRight size={18} color={C.base900} />
          </Pressable>
          <Text style={styles.sortHint}>
            {unblocked.length} {unblocked.length !== 1 ? tr('dump.tasks_ready_plural') : tr('dump.tasks_ready')}
          </Text>
        </Animated.View>
      )}

      {/* Input bar — manually lifted by keyboardHeight via Keyboard listener (works in Expo Go) */}
      <View
        style={[
          styles.inputSafe,
          {
            paddingBottom: keyboardHeight > 0 ? S[3] : insets.bottom || 12,
            marginBottom: keyboardHeight,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={tr('dump.placeholder')}
            placeholderTextColor={C.fgTertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSubmitText}
            returnKeyType="done"
            multiline={true}
            blurOnSubmit={true}
            accessibilityLabel="Add a thought"
          />
          <Pressable
            style={({ pressed }) => [
              styles.inputBtn,
              !inputText.trim() && styles.inputBtnDisabled,
              pressed && inputText.trim() && styles.inputBtnPressed,
            ]}
            onPress={handleSubmitText}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Submit thought"
          >
            <ArrowUp size={18} color={inputText.trim() ? C.base900 : C.fgTertiary} />
          </Pressable>
        </View>
      </View>

      {/* TaskEvalSheet */}
      {sheetOpen && (
        <TaskEvalSheet
          pendingText={inputText.trim()}
          onAdd={handleAddTask}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </View>
  );
}

interface CardProps {
  task: Task;
  jitter: number;
  rank?: number;
  onRemove: () => void;
  onToggleBlocked: () => void;
}

function TaskCard({ task, jitter, rank, onRemove, onToggleBlocked }: CardProps) {
  const WorkIcon = WORK_TYPE_ICONS[task.workType];
  const workColor = WORK_TYPE_COLORS[task.workType];

  return (
    <View
      style={[
        styles.card,
        task.blocked && styles.cardBlocked,
        { transform: [{ rotate: `${jitter}deg` }] },
      ]}
    >
      <View style={styles.cardLeft}>
        {rank !== undefined ? (
          <Text style={styles.rankNum}>{rank}</Text>
        ) : (
          <PriorityDot importance={task.importance} size={9} />
        )}
        <Text style={[styles.cardText, task.blocked && styles.cardTextBlocked]} numberOfLines={3}>
          {task.text}
        </Text>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.cardChips}>
          <View style={[styles.typeChip, { backgroundColor: `${workColor}22` }]}>
            <WorkIcon size={11} color={workColor} />
            <Text style={[styles.typeChipText, { color: workColor }]}>
              {task.workType}
            </Text>
          </View>
          {task.deadlineLabel && (
            <View style={styles.deadlineChip}>
              <Calendar size={10} color={C.fgTertiary} />
              <Text style={styles.deadlineChipText}>
                {task.deadlineLabel.replace('_', ' ')}
              </Text>
            </View>
          )}
          {task.scheduledTime && (
            <View style={styles.deadlineChip}>
              <Clock size={10} color={C.fgTertiary} />
              <Text style={styles.deadlineChipText}>{task.scheduledTime}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <Pressable
            onPress={onToggleBlocked}
            style={({ pressed }) => [
              styles.iconBtn,
              task.blocked && styles.iconBtnActive,
              pressed && styles.iconBtnPressed,
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={task.blocked ? 'Unblock task' : 'Block task'}
          >
            <Ban size={14} color={task.blocked ? C.fgSecondary : C.fgTertiary} />
          </Pressable>
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Remove task"
          >
            <X size={14} color={C.fgTertiary} />
          </Pressable>
        </View>
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: S[5],
    paddingTop: S[4],
    paddingBottom: S[5],
  },
  headerEyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
    lineHeight: Size['3xl'] * 1.1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2],
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.base700,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnActive: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  headerIconBtnPressed: {
    backgroundColor: C.base600,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.base700,
    borderRadius: 20,
    paddingHorizontal: S[3],
    paddingVertical: S[1] + 2,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  blockedBadgeText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  sortModeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: S[3],
    paddingVertical: S[1] + 2,
    backgroundColor: 'rgba(201,162,39,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderGold,
    alignSelf: 'flex-start',
    marginBottom: S[2],
  },
  sortModeLabelText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    letterSpacing: 0.5,
  },
  rankNum: {
    fontFamily: Font.mono,
    fontSize: Size.xs,
    color: C.gold400,
    minWidth: 16,
    textAlign: 'center',
    marginTop: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: S[5],
    gap: S[3],
  },
  emptyState: {
    marginTop: S[10],
    alignItems: 'center',
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
    lineHeight: Size.sm * 1.6,
  },
  card: {
    backgroundColor: C.base700,
    borderRadius: 14,
    padding: S[4],
    borderWidth: 1,
    borderColor: C.borderDefault,
    gap: S[3],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardBlocked: {
    opacity: 0.45,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[2] + 2,
  },
  cardText: {
    flex: 1,
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    lineHeight: Size.base * 1.5,
    marginTop: -2,
  },
  cardTextBlocked: {
    textDecorationLine: 'line-through',
    color: C.fgTertiary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[2],
  },
  cardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeChipText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: C.base600,
  },
  deadlineChipText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: S[1],
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  iconBtnActive: {
    backgroundColor: C.base600,
  },
  iconBtnPressed: {
    backgroundColor: C.base600,
    opacity: 0.7,
  },
  sortCTAWrapper: {
    position: 'absolute',
    left: S[5],
    right: S[5],
    alignItems: 'center',
    gap: S[1] + 2,
  },
  sortCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    backgroundColor: C.gold500,
    borderRadius: 28,
    paddingVertical: S[4],
    paddingHorizontal: S[6],
    minWidth: 200,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: C.gold500,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  sortCTAPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.97 }],
  },
  sortCTAText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.md,
    color: C.base900,
  },
  sortHint: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  inputSafe: {
    backgroundColor: C.base850,
    borderTopWidth: 1,
    borderTopColor: C.borderSubtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingTop: S[3],
    gap: S[3],
  },
  input: {
    flex: 1,
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    paddingVertical: S[2] + 2,
    minHeight: 44,
    maxHeight: 100,
  },
  inputBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.gold500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBtnDisabled: {
    backgroundColor: C.base700,
  },
  inputBtnPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.93 }],
  },
});
