import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Pressable,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import {
  Brain,
  BookOpen,
  Users,
  Dumbbell,
  ClipboardList,
  Calendar,
  Clock,
  X,
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

const DEADLINE_PRESETS: { value: Exclude<DeadlineLabel, null>; label: string; days: number }[] = [
  { value: 'today', label: 'Today', days: 0 },
  { value: 'tomorrow', label: 'Tomorrow', days: 1 },
  { value: 'this_week', label: 'This week', days: 7 },
  { value: 'later', label: 'Later', days: 30 },
];

const DURATION_DEFAULTS: Record<WorkType, number> = {
  deep: 90,
  learning: 60,
  social: 45,
  body: 60,
  admin: 30,
};

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

function deadlineLabelFromDate(date: Date): DeadlineLabel {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff = Math.round((target.getTime() - startOfToday.getTime()) / 86400000);
  if (daysDiff <= 0) return 'today';
  if (daysDiff === 1) return 'tomorrow';
  if (daysDiff <= 7) return 'this_week';
  return 'later';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function presetDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 59, 0);
  return d;
}

export function TaskEvalSheet({ pendingText, onAdd, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  const [importance, setImportance] = useState<Importance | null>(null);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlineLabel>(null);
  const [customDeadline, setCustomDeadline] = useState<Date | null>(null);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedDate, setSchedDate] = useState<Date>(new Date());
  const [schedTime, setSchedTime] = useState<Date>(new Date());
  const [showSchedDatePicker, setShowSchedDatePicker] = useState(false);
  const [showSchedTimePicker, setShowSchedTimePicker] = useState(false);

  const [durationStr, setDurationStr] = useState('');

  const canAdd = importance !== null && workType !== null;

  const handleAdd = useCallback(() => {
    if (!importance || !workType) return;
    const dur = durationStr ? parseInt(durationStr, 10) : null;

    let deadline: string | null = null;
    let deadlineLabel: DeadlineLabel = null;
    if (customDeadline) {
      deadline = customDeadline.toISOString();
      deadlineLabel = deadlineLabelFromDate(customDeadline);
    } else if (deadlinePreset) {
      const preset = DEADLINE_PRESETS.find((p) => p.value === deadlinePreset);
      if (preset) {
        deadline = presetDate(preset.days).toISOString();
        deadlineLabel = deadlinePreset;
      }
    }

    const task: Task = {
      id: Date.now().toString(),
      text: pendingText,
      importance,
      workType,
      durationMins: dur && !isNaN(dur) ? dur : null,
      deadlineLabel,
      deadline,
      scheduledDate: scheduleEnabled ? schedDate.toISOString().slice(0, 10) : null,
      scheduledTime: scheduleEnabled ? formatTime(schedTime) : null,
      blocked: false,
      createdAt: new Date().toISOString(),
    };
    impact(Haptics.ImpactFeedbackStyle.Medium);
    onAdd(task);
  }, [importance, workType, deadlinePreset, customDeadline, durationStr, scheduleEnabled, schedDate, schedTime, pendingText, onAdd]);

  const durationPlaceholder = workType
    ? `${DURATION_DEFAULTS[workType]} min (default)`
    : '60 min';

  // Date picker handlers
  const onDeadlinePicked = (event: DateTimePickerEvent, date?: Date) => {
    setShowDeadlinePicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setCustomDeadline(date);
      setDeadlinePreset(null);
      impact();
    }
  };

  const onSchedDatePicked = (event: DateTimePickerEvent, date?: Date) => {
    setShowSchedDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setSchedDate(date);
      impact();
    }
  };

  const onSchedTimePicked = (event: DateTimePickerEvent, date?: Date) => {
    setShowSchedTimePicker(Platform.OS === 'ios');
    if (event.type === 'set' && date) {
      setSchedTime(date);
      impact();
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
        />
      )}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Adding</Text>
          <Text style={styles.previewText} numberOfLines={3}>{pendingText}</Text>
        </View>

        {/* Importance */}
        <Text style={styles.sectionLabel}>
          Priority <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.importanceGrid}>
          {IMPORTANCE_OPTIONS.map((opt) => {
            const selected = importance === opt.value;
            const color = IMPORTANCE_COLORS[opt.value];
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.importanceCard,
                  selected && { borderColor: color, backgroundColor: `${color}1c` },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  impact();
                  setImportance(opt.value);
                }}
              >
                <View style={[styles.importanceDot, { backgroundColor: color }]} />
                <Text style={styles.importanceLabel}>{opt.label}</Text>
                <Text style={styles.importanceDesc}>{opt.desc}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Work type */}
        <Text style={styles.sectionLabel}>
          Work type <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.typeRow}>
          {WORK_TYPE_OPTIONS.map((opt) => {
            const selected = workType === opt.value;
            const color = WORK_TYPE_COLORS[opt.value];
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.typeChip,
                  selected && { borderColor: color, backgroundColor: `${color}22` },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  impact();
                  setWorkType(opt.value);
                }}
              >
                <opt.Icon size={14} color={selected ? color : C.fgTertiary} />
                <Text style={[styles.typeLabel, selected && { color }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Duration */}
        <Text style={styles.sectionLabel}>
          Duration <Text style={styles.optional}>optional</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder={durationPlaceholder}
          placeholderTextColor={C.fgTertiary}
          keyboardType="number-pad"
          value={durationStr}
          onChangeText={setDurationStr}
          maxLength={4}
          accessibilityLabel="Duration in minutes"
        />

        {/* Deadline */}
        <Text style={styles.sectionLabel}>
          Deadline <Text style={styles.optional}>optional</Text>
        </Text>
        <View style={styles.deadlineRow}>
          {DEADLINE_PRESETS.map((opt) => {
            const selected = deadlinePreset === opt.value && !customDeadline;
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.deadlineChip,
                  selected && styles.deadlineChipActive,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  impact();
                  setDeadlinePreset(selected ? null : opt.value);
                  setCustomDeadline(null);
                }}
              >
                <Calendar size={12} color={selected ? C.gold400 : C.fgTertiary} />
                <Text style={[styles.deadlineLabel, selected && styles.deadlineLabelActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.specificDateBtn,
            customDeadline && styles.specificDateBtnActive,
            pressed && styles.cardPressed,
          ]}
          onPress={() => {
            impact();
            setShowDeadlinePicker(true);
          }}
        >
          <Calendar size={14} color={customDeadline ? C.gold400 : C.fgSecondary} />
          <Text style={[styles.specificDateText, customDeadline && styles.specificDateTextActive]}>
            {customDeadline ? formatDate(customDeadline) : 'Pick specific date'}
          </Text>
          {customDeadline && (
            <Pressable
              onPress={() => {
                impact();
                setCustomDeadline(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.clearBtn}
            >
              <X size={12} color={C.fgTertiary} />
            </Pressable>
          )}
        </Pressable>
        {showDeadlinePicker && (
          <DateTimePicker
            value={customDeadline ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDeadlinePicked}
            minimumDate={new Date()}
            themeVariant="dark"
          />
        )}

        {/* Scheduled time */}
        <Text style={styles.sectionLabel}>
          Schedule <Text style={styles.optional}>optional — pin to specific date & time</Text>
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.toggleRow,
            scheduleEnabled && styles.toggleRowActive,
            pressed && styles.cardPressed,
          ]}
          onPress={() => {
            impact();
            setScheduleEnabled(!scheduleEnabled);
          }}
        >
          <Clock size={14} color={scheduleEnabled ? C.gold400 : C.fgSecondary} />
          <Text style={[styles.toggleLabel, scheduleEnabled && styles.toggleLabelActive]}>
            {scheduleEnabled ? 'Scheduled' : 'Schedule for specific time'}
          </Text>
          <View style={[styles.toggleSwitch, scheduleEnabled && styles.toggleSwitchActive]}>
            <View style={[styles.toggleKnob, scheduleEnabled && styles.toggleKnobActive]} />
          </View>
        </Pressable>

        {scheduleEnabled && (
          <View style={styles.schedFields}>
            <Pressable
              style={({ pressed }) => [styles.schedField, pressed && styles.cardPressed]}
              onPress={() => {
                impact();
                setShowSchedDatePicker(true);
              }}
            >
              <Calendar size={14} color={C.gold400} />
              <Text style={styles.schedFieldText}>{formatDate(schedDate)}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.schedField, pressed && styles.cardPressed]}
              onPress={() => {
                impact();
                setShowSchedTimePicker(true);
              }}
            >
              <Clock size={14} color={C.gold400} />
              <Text style={styles.schedFieldText}>{formatTime(schedTime)}</Text>
            </Pressable>
          </View>
        )}

        {showSchedDatePicker && (
          <DateTimePicker
            value={schedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onSchedDatePicked}
            minimumDate={new Date()}
            themeVariant="dark"
          />
        )}
        {showSchedTimePicker && (
          <DateTimePicker
            value={schedTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onSchedTimePicked}
            is24Hour={true}
            themeVariant="dark"
          />
        )}

        {/* Add button */}
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            !canAdd && styles.addBtnDisabled,
            pressed && canAdd && styles.addBtnPressed,
          ]}
          onPress={handleAdd}
          disabled={!canAdd}
          accessibilityRole="button"
        >
          <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
            Add task
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
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
  content: {
    paddingHorizontal: S[5],
    paddingBottom: S[12],
  },
  cardPressed: {
    opacity: 0.85,
  },
  preview: {
    backgroundColor: C.base800,
    borderRadius: 12,
    padding: S[4],
    marginBottom: S[4],
    borderWidth: 1,
    borderColor: C.borderDefault,
    gap: S[1],
  },
  previewLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  previewText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    lineHeight: Size.base * 1.5,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgSecondary,
    marginBottom: S[2] + 2,
    marginTop: S[5],
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  required: {
    color: C.danger,
    fontWeight: '700',
  },
  optional: {
    color: C.fgTertiary,
    textTransform: 'none',
    letterSpacing: 0,
    fontStyle: 'italic',
  },
  importanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  importanceCard: {
    width: '48.5%',
    padding: S[3] + 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.borderDefault,
    backgroundColor: C.base800,
    gap: 4,
  },
  importanceDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginBottom: S[1],
  },
  importanceLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.fgPrimary,
  },
  importanceDesc: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    lineHeight: Size.xs * 1.4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: S[2],
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: S[3] + 2,
    paddingVertical: S[2] + 2,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.borderDefault,
    backgroundColor: C.base800,
    minHeight: 38,
  },
  typeLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgTertiary,
  },
  textInput: {
    backgroundColor: C.base800,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.borderDefault,
    paddingHorizontal: S[4],
    paddingVertical: S[3] + 2,
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    minHeight: 48,
  },
  deadlineRow: {
    flexDirection: 'row',
    gap: S[2],
    flexWrap: 'wrap',
    marginBottom: S[2],
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: S[3] + 2,
    paddingVertical: S[2] + 2,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.borderDefault,
    backgroundColor: C.base800,
    minHeight: 38,
  },
  deadlineChipActive: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  deadlineLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgTertiary,
  },
  deadlineLabelActive: {
    color: C.gold400,
  },
  specificDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2] + 2,
    paddingHorizontal: S[4],
    paddingVertical: S[3] + 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.borderDefault,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  specificDateBtnActive: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.08)',
    borderStyle: 'solid',
  },
  specificDateText: {
    flex: 1,
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgSecondary,
  },
  specificDateTextActive: {
    color: C.gold400,
  },
  clearBtn: {
    padding: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[2] + 2,
    paddingHorizontal: S[4],
    paddingVertical: S[3] + 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.borderDefault,
    backgroundColor: C.base800,
    minHeight: 52,
  },
  toggleRowActive: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  toggleLabel: {
    flex: 1,
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgSecondary,
  },
  toggleLabelActive: {
    color: C.gold400,
  },
  toggleSwitch: {
    width: 36,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.base600,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: C.gold500,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.fgPrimary,
  },
  toggleKnobActive: {
    transform: [{ translateX: 14 }],
    backgroundColor: C.base900,
  },
  schedFields: {
    flexDirection: 'row',
    gap: S[2],
    marginTop: S[2],
  },
  schedField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[3] + 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.08)',
    minHeight: 48,
  },
  schedFieldText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.gold400,
  },
  addBtn: {
    marginTop: S[8],
    backgroundColor: C.gold500,
    borderRadius: 16,
    paddingVertical: S[4] + 2,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: C.base700,
  },
  addBtnPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.98 }],
  },
  addBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.md,
    color: C.base900,
    letterSpacing: 0.3,
  },
  addBtnTextDisabled: {
    color: C.fgTertiary,
  },
});
