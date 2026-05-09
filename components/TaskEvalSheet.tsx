import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
  Calendar,
  Clock,
} from 'lucide-react-native';
import { Importance, WorkType, DeadlineLabel, Task } from '../types/task';
import { C, IMPORTANCE_COLORS, WORK_TYPE_COLORS } from '../constants/colors';
import { Font, Size } from '../constants/typography';
import { S } from '../constants/spacing';

interface Props {
  pendingText: string;
  onAdd: (task: Task) => void;
  onClose: () => void;
}

const IMPORTANCE_OPTIONS: { value: Importance; label: string; desc: string }[] = [
  { value: 'must', label: 'Must', desc: "Critical, can't skip" },
  { value: 'should', label: 'Should', desc: 'Important, high value' },
  { value: 'could', label: 'Could', desc: 'Useful if time allows' },
  { value: 'would', label: 'Would', desc: 'Nice to have someday' },
];

const WORK_TYPE_OPTIONS: { value: WorkType; label: string; Icon: React.FC<{ size: number; color: string }> }[] = [
  { value: 'deep', label: 'Deep', Icon: Brain },
  { value: 'learning', label: 'Learn', Icon: BookOpen },
  { value: 'social', label: 'Social', Icon: Users },
  { value: 'body', label: 'Body', Icon: Dumbbell },
  { value: 'admin', label: 'Admin', Icon: ClipboardList },
];

const DEADLINE_OPTIONS: { value: DeadlineLabel; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This week' },
  { value: 'later', label: 'Later' },
];

const DURATION_DEFAULTS: Record<WorkType, number> = {
  deep: 90,
  learning: 60,
  social: 45,
  body: 60,
  admin: 30,
};

export function TaskEvalSheet({ pendingText, onAdd, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const [importance, setImportance] = useState<Importance | null>(null);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [deadline, setDeadline] = useState<DeadlineLabel>(null);
  const [durationStr, setDurationStr] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const canAdd = importance !== null && workType !== null;

  const handleAdd = useCallback(() => {
    if (!importance || !workType) return;
    const dur = durationStr ? parseInt(durationStr, 10) : null;
    const task: Task = {
      id: Date.now().toString(),
      text: pendingText,
      importance,
      workType,
      durationMins: dur && !isNaN(dur) ? dur : null,
      deadlineLabel: deadline,
      deadline: null,
      scheduledDate: null,
      scheduledTime: scheduledTime.trim() || null,
      blocked: false,
      createdAt: new Date().toISOString(),
    };
    onAdd(task);
  }, [importance, workType, deadline, durationStr, scheduledTime, pendingText, onAdd]);

  const durationPlaceholder = workType
    ? `${DURATION_DEFAULTS[workType]} min`
    : '60 min';

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewText} numberOfLines={2}>{pendingText}</Text>
        </View>

        {/* Importance */}
        <Text style={styles.sectionLabel}>Priority <Text style={styles.required}>*</Text></Text>
        <View style={styles.importanceGrid}>
          {IMPORTANCE_OPTIONS.map((opt) => {
            const selected = importance === opt.value;
            const color = IMPORTANCE_COLORS[opt.value];
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.importanceCard,
                  selected && { borderColor: color, backgroundColor: `${color}22` },
                ]}
                onPress={() => setImportance(opt.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.importanceDot, { backgroundColor: color }]} />
                <Text style={styles.importanceLabel}>{opt.label}</Text>
                <Text style={styles.importanceDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Work type */}
        <Text style={styles.sectionLabel}>Work type <Text style={styles.required}>*</Text></Text>
        <View style={styles.typeRow}>
          {WORK_TYPE_OPTIONS.map((opt) => {
            const selected = workType === opt.value;
            const color = WORK_TYPE_COLORS[opt.value];
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.typeChip,
                  selected && { borderColor: color, backgroundColor: `${color}22` },
                ]}
                onPress={() => setWorkType(opt.value)}
                activeOpacity={0.7}
              >
                <opt.Icon size={14} color={selected ? color : C.fgTertiary} />
                <Text style={[styles.typeLabel, selected && { color }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration */}
        <Text style={styles.sectionLabel}>Duration <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textInput}
          placeholder={durationPlaceholder}
          placeholderTextColor={C.fgTertiary}
          keyboardType="number-pad"
          value={durationStr}
          onChangeText={setDurationStr}
          maxLength={4}
        />

        {/* Deadline */}
        <Text style={styles.sectionLabel}>Deadline <Text style={styles.optional}>(optional)</Text></Text>
        <View style={styles.deadlineRow}>
          {DEADLINE_OPTIONS.map((opt) => {
            const selected = deadline === opt.value;
            return (
              <TouchableOpacity
                key={opt.value ?? 'none'}
                style={[styles.deadlineChip, selected && styles.deadlineChipActive]}
                onPress={() => setDeadline(selected ? null : opt.value)}
                activeOpacity={0.7}
              >
                <Calendar size={12} color={selected ? C.gold400 : C.fgTertiary} />
                <Text style={[styles.deadlineLabel, selected && styles.deadlineLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scheduled time */}
        <Text style={styles.sectionLabel}>Scheduled time <Text style={styles.optional}>(optional, HH:MM)</Text></Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 09:30"
          placeholderTextColor={C.fgTertiary}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          value={scheduledTime}
          onChangeText={setScheduledTime}
          maxLength={5}
        />

        {/* Add button */}
        <TouchableOpacity
          style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!canAdd}
          activeOpacity={0.85}
        >
          <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
            Add task
          </Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: C.base850,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    backgroundColor: C.fgTertiary,
    width: 36,
  },
  content: {
    paddingHorizontal: S[5],
    paddingBottom: S[10],
  },
  preview: {
    backgroundColor: C.base800,
    borderRadius: 10,
    padding: S[4],
    marginBottom: S[5],
    borderWidth: 1,
    borderColor: C.borderDefault,
  },
  previewText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgSecondary,
    marginBottom: S[2],
    marginTop: S[4],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  required: {
    color: C.danger,
  },
  optional: {
    color: C.fgTertiary,
    textTransform: 'none',
    letterSpacing: 0,
  },
  importanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  importanceCard: {
    width: '48%',
    padding: S[3],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDefault,
    backgroundColor: C.base800,
  },
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: S[1],
  },
  importanceLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgPrimary,
    marginBottom: 2,
  },
  importanceDesc: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: S[2],
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderDefault,
    backgroundColor: C.base800,
  },
  typeLabel: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
  },
  textInput: {
    backgroundColor: C.base800,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDefault,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
  },
  deadlineRow: {
    flexDirection: 'row',
    gap: S[2],
    flexWrap: 'wrap',
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderDefault,
    backgroundColor: C.base800,
  },
  deadlineChipActive: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  deadlineLabel: {
    fontFamily: Font.body,
    fontSize: Size.sm,
    color: C.fgTertiary,
  },
  deadlineLabelActive: {
    color: C.gold400,
  },
  addBtn: {
    marginTop: S[6],
    backgroundColor: C.gold500,
    borderRadius: 14,
    paddingVertical: S[4],
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: C.base700,
  },
  addBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.md,
    color: C.base900,
  },
  addBtnTextDisabled: {
    color: C.fgTertiary,
  },
});
