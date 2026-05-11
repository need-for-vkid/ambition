import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
  Plus,
  RotateCcw,
} from 'lucide-react-native';
import { Task, WorkType } from '../types/task';
import { selectionScore } from '../lib/scheduler';
import { useTaskStore } from '../store/tasks';
import { C, IMPORTANCE_COLORS, WORK_TYPE_COLORS } from '../constants/colors';
import { Font, Size } from '../constants/typography';
import { S } from '../constants/spacing';

const WORK_TYPE_ICONS: Record<WorkType, React.FC<{ size: number; color: string }>> = {
  deep: Brain,
  learning: BookOpen,
  social: Users,
  body: Dumbbell,
  admin: ClipboardList,
};

interface Props {
  onClose: () => void;
}

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

export function AddToTodaySheet({ onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const { tasks, dayPlan, addToToday, forcedTodayIds } = useTaskStore();

  const candidates = useMemo(() => {
    if (!dayPlan) return [];
    const scheduledIds = new Set(
      dayPlan.plan.filter((b) => b.kind !== 'lunch').map((b) => b.task.id)
    );
    const now = new Date();
    const available = tasks.filter(
      (t) => !t.blocked && !scheduledIds.has(t.id) && !forcedTodayIds.has(t.id)
    );
    return available.sort((a, b) => selectionScore(b, now) - selectionScore(a, now));
  }, [tasks, dayPlan, forcedTodayIds]);

  const handleAdd = (id: string) => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    addToToday(id);
    onClose();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={['75%']}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
        />
      )}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Add to today</Text>
        <Text style={styles.title}>From your backlog</Text>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {candidates.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing left in the backlog.</Text>
            <Text style={styles.emptyText}>
              Everything you have is already on the plan.
            </Text>
          </View>
        ) : (
          candidates.map((task) => (
            <TaskRow key={task.id} task={task} onAdd={() => handleAdd(task.id)} />
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function TaskRow({ task, onAdd }: { task: Task; onAdd: () => void }) {
  const WorkIcon = WORK_TYPE_ICONS[task.workType];
  const workColor = WORK_TYPE_COLORS[task.workType];
  const impColor = IMPORTANCE_COLORS[task.importance];

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onAdd}
      accessibilityRole="button"
      accessibilityLabel={`Add ${task.text} to today`}
    >
      <View style={[styles.importanceDot, { backgroundColor: impColor }]} />
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {task.text}
        </Text>
        <View style={styles.rowMeta}>
          <View style={styles.metaItem}>
            <WorkIcon size={10} color={workColor} />
            <Text style={[styles.metaText, { color: workColor }]}>
              {task.workType}
            </Text>
          </View>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaText}>{task.importance}</Text>
          {task.carryOverCount && task.carryOverCount > 0 ? (
            <>
              <Text style={styles.metaSep}>·</Text>
              <View style={styles.carryRow}>
                <RotateCcw size={9} color={C.fgTertiary} />
                <Text style={styles.metaText}>{task.carryOverCount}d</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.addBtn}>
        <Plus size={16} color={C.gold400} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: C.base850,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: C.fgTertiary,
    width: 40,
    height: 4,
  },
  header: {
    paddingHorizontal: S[5],
    paddingTop: S[3],
    paddingBottom: S[4],
    gap: 4,
  },
  eyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Font.display,
    fontSize: Size['2xl'],
    color: C.fgPrimary,
    lineHeight: Size['2xl'] * 1.15,
  },
  list: {
    paddingHorizontal: S[5],
    paddingBottom: S[12],
    gap: S[2],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: S[10],
    gap: S[2],
  },
  emptyTitle: {
    fontFamily: Font.display,
    fontSize: Size.lg,
    color: C.fgSecondary,
  },
  emptyText: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.base700,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDefault,
    paddingVertical: S[3],
    paddingHorizontal: S[3] + 2,
    gap: S[2] + 2,
    minHeight: 60,
  },
  rowPressed: {
    backgroundColor: C.base600,
    transform: [{ scale: 0.99 }],
  },
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgPrimary,
    lineHeight: Size.sm * 1.4,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'capitalize',
  },
  metaSep: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  carryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201,162,39,0.10)',
    borderWidth: 1,
    borderColor: C.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
