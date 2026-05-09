import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TaskEvalSheet } from '../../components/TaskEvalSheet';
import { PriorityDot } from '../../components/atoms/PriorityDot';
import { Badge } from '../../components/atoms/Badge';
import { useTaskStore } from '../../store/tasks';
import { Task, WorkType } from '../../types/task';
import { C, WORK_TYPE_COLORS } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

const JITTER: number[] = [-2.1, 1.4, -0.8, 2.3, -1.7, 0.9, -2.5, 1.1, -0.5, 2.0];

const WORK_TYPE_ICONS: Record<WorkType, React.FC<{ size: number; color: string }>> = {
  deep: Brain,
  learning: BookOpen,
  social: Users,
  body: Dumbbell,
  admin: ClipboardList,
};

export default function DumpScreen() {
  const router = useRouter();
  const { tasks, addTask, removeTask, toggleBlocked } = useTaskStore();
  const [inputText, setInputText] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const unblocked = tasks.filter((t) => !t.blocked);
  const blockedCount = tasks.filter((t) => t.blocked).length;
  const canSort = unblocked.length >= 2;

  const handleSubmitText = useCallback(() => {
    if (!inputText.trim()) return;
    setSheetOpen(true);
  }, [inputText]);

  const handleAddTask = useCallback(
    (task: Task) => {
      addTask(task);
      setInputText('');
      setSheetOpen(false);
    },
    [addTask]
  );

  const handleSort = useCallback(() => {
    router.push('/(flow)/sorting');
  }, [router]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Brain dump</Text>
            <Text style={styles.headerTitle}>What's on your mind?</Text>
          </View>
          {blockedCount > 0 && (
            <View style={styles.blockedBadge}>
              <Ban size={12} color={C.fgTertiary} />
              <Text style={styles.blockedBadgeText}>{blockedCount}</Text>
            </View>
          )}
        </View>

        {/* Task list */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Type anything — tasks, worries, ideas.{'\n'}Don't filter. Just dump.
              </Text>
            </View>
          )}
          {tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              jitter={JITTER[i % JITTER.length]}
              onRemove={() => removeTask(task.id)}
              onToggleBlocked={() => toggleBlocked(task.id)}
            />
          ))}
        </ScrollView>

        {/* Sort CTA */}
        {canSort && (
          <View style={styles.sortCTAWrapper}>
            <TouchableOpacity style={styles.sortCTA} onPress={handleSort} activeOpacity={0.85}>
              <Text style={styles.sortCTAText}>Sort my day</Text>
              <ChevronRight size={18} color={C.base900} />
            </TouchableOpacity>
            <Text style={styles.sortHint}>
              {unblocked.length} task{unblocked.length !== 1 ? 's' : ''} ready
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a thought…"
              placeholderTextColor={C.fgTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSubmitText}
              returnKeyType="done"
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.inputBtn, !inputText.trim() && styles.inputBtnDisabled]}
              onPress={handleSubmitText}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <ArrowUp size={18} color={inputText.trim() ? C.base900 : C.fgTertiary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

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
  onRemove: () => void;
  onToggleBlocked: () => void;
}

function TaskCard({ task, jitter, onRemove, onToggleBlocked }: CardProps) {
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
        <PriorityDot importance={task.importance} size={8} />
        <Text style={[styles.cardText, task.blocked && styles.cardTextBlocked]} numberOfLines={2}>
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
          <TouchableOpacity
            onPress={onToggleBlocked}
            style={[styles.iconBtn, task.blocked && styles.iconBtnActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ban size={14} color={task.blocked ? C.fgSecondary : C.fgTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRemove}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={C.fgTertiary} />
          </TouchableOpacity>
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
    paddingBottom: S[4],
  },
  headerEyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Font.display,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.base700,
    borderRadius: 20,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  blockedBadgeText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: S[5],
    paddingBottom: S[4],
    gap: S[3],
  },
  emptyState: {
    marginTop: S[8],
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: C.base700,
    borderRadius: 12,
    padding: S[4],
    borderWidth: 1,
    borderColor: C.borderDefault,
    gap: S[2],
  },
  cardBlocked: {
    opacity: 0.45,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[2],
  },
  cardText: {
    flex: 1,
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    lineHeight: 22,
    marginTop: -1,
  },
  cardTextBlocked: {
    textDecorationLine: 'line-through',
    color: C.fgTertiary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeChipText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: C.base600,
  },
  deadlineChipText: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: S[2],
  },
  iconBtn: {
    padding: 4,
    borderRadius: 6,
  },
  iconBtnActive: {
    backgroundColor: C.base600,
  },
  sortCTAWrapper: {
    alignItems: 'center',
    paddingHorizontal: S[5],
    paddingBottom: S[3],
    gap: S[1],
  },
  sortCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    backgroundColor: C.gold500,
    borderRadius: 16,
    paddingVertical: S[4],
    width: '100%',
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
    paddingVertical: S[3],
    gap: S[3],
  },
  input: {
    flex: 1,
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    paddingVertical: S[2],
  },
  inputBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.gold500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBtnDisabled: {
    backgroundColor: C.base700,
  },
});
