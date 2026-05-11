import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Sparkles, Minus, Cloud } from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { Mood, DaySummary } from '../../types/task';
import { useT } from '../../lib/i18n';
import { getDaySummary } from '../../lib/storage';
import { C } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function timeOfDayKey(d: Date): string {
  const h = d.getHours();
  if (h >= 4 && h < 12) return 'dayclose.eyebrow_morning';
  if (h >= 12 && h < 18) return 'dayclose.eyebrow_afternoon';
  if (h >= 18 && h < 22) return 'dayclose.eyebrow_evening';
  return 'dayclose.eyebrow_night';
}

export default function DayCloseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tr = useT();
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate = params.date ?? todayISO();
  const isEditingPast = !!params.date && params.date !== todayISO();

  const { completed, saveDaySummary } = useTaskStore();

  // Stats: completed tasks for this date
  const dayCompleted = useMemo(
    () => completed.filter((c) => c.completedAt.slice(0, 10) === targetDate),
    [completed, targetDate]
  );

  const tasksCompleted = dayCompleted.length;
  const focusMins = useMemo(
    () => dayCompleted.reduce((acc, c) => acc + (c.task.durationMins ?? 0), 0),
    [dayCompleted]
  );
  const deepCount = useMemo(
    () => dayCompleted.filter((c) => c.task.workType === 'deep').length,
    [dayCompleted]
  );
  const tasksPlanned = Math.max(tasksCompleted, 5); // visual default for the progress bar segments

  // Mood + note state — preload from existing summary if editing
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const existing = await getDaySummary(targetDate);
      if (cancel) return;
      if (existing) {
        setMood(existing.mood);
        setNote(existing.note ?? '');
      }
      setLoaded(true);
    })();
    return () => { cancel = true; };
  }, [targetDate]);

  const now = new Date();
  const eyebrowLabel = `${tr(timeOfDayKey(now))}, ${formatTime(now)}`;

  const handleSave = useCallback(async () => {
    impact(Haptics.ImpactFeedbackStyle.Medium);
    const summary: DaySummary = {
      date: targetDate,
      mood,
      note: note.trim() || null,
      tasksCompleted,
      tasksPlanned,
      focusMins,
      deepCount,
      createdAt: new Date().toISOString(),
    };
    await saveDaySummary(summary);
    if (isEditingPast) {
      router.back();
    } else {
      router.replace('/(flow)/history');
    }
  }, [targetDate, mood, note, tasksCompleted, tasksPlanned, focusMins, deepCount, saveDaySummary, router, isEditingPast]);

  const handleMood = (m: Mood) => {
    impact();
    setMood(m === mood ? null : m);
  };

  const focusHoursStr = focusMins > 0
    ? (focusMins / 60).toFixed(1).replace('.0', '') + 'h'
    : '—';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar with close */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              onPress={() => {
                impact();
                router.back();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={C.fgTertiary} />
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>

          {/* Eyebrow + headline */}
          <Animated.View entering={FadeIn.duration(500)}>
            <Text style={styles.eyebrow}>{eyebrowLabel}</Text>
            <Text style={styles.headline}>{tr('dayclose.headline')}</Text>
          </Animated.View>

          {/* The day card */}
          <Animated.View entering={FadeInUp.delay(80).duration(500)} style={styles.dayCard}>
            <View style={styles.dayCardHeader}>
              <Text style={styles.dayCardEyebrow}>{tr('dayclose.the_day')}</Text>
              <Text style={styles.dayCardCounter}>
                {tasksCompleted} {tr('dayclose.done_of')} {tasksPlanned} {tr('dayclose.done_word')}
              </Text>
            </View>
            <ProgressBar segments={tasksPlanned} filled={Math.min(tasksCompleted, tasksPlanned)} />
            <View style={styles.statsRow}>
              <Stat value={focusHoursStr} label={tr('dayclose.focus_label')} />
              <Stat value={String(deepCount)} label={tr('dayclose.deep_label')} />
              <Stat value={String(tasksCompleted)} label={tr('dayclose.wins_label')} />
            </View>
          </Animated.View>

          {/* Mood */}
          <Animated.View entering={FadeInUp.delay(160).duration(500)}>
            <Text style={styles.sectionLabel}>{tr('dayclose.mood_label')}</Text>
            <View style={styles.moodRow}>
              <MoodChip
                value="great"
                Icon={Sparkles}
                label={tr('dayclose.mood.great')}
                selected={mood === 'great'}
                onPress={handleMood}
              />
              <MoodChip
                value="steady"
                Icon={Minus}
                label={tr('dayclose.mood.steady')}
                selected={mood === 'steady'}
                onPress={handleMood}
              />
              <MoodChip
                value="heavy"
                Icon={Cloud}
                label={tr('dayclose.mood.heavy')}
                selected={mood === 'heavy'}
                onPress={handleMood}
              />
            </View>
          </Animated.View>

          {/* One line */}
          <Animated.View entering={FadeInUp.delay(240).duration(500)}>
            <Text style={styles.sectionLabel}>{tr('dayclose.one_line_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={tr('dayclose.one_line_placeholder')}
              placeholderTextColor={C.fgTertiary}
              value={note}
              onChangeText={setNote}
              maxLength={140}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              accessibilityLabel="One line reflection"
            />
          </Animated.View>
        </ScrollView>

        {/* Close-the-day button (fixed bottom) */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + S[3] }]}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
              !loaded && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!loaded}
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>{tr('dayclose.save')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ProgressBar({ segments, filled }: { segments: number; filled: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSeg,
            i < filled ? styles.progressSegFilled : styles.progressSegEmpty,
          ]}
        />
      ))}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface MoodChipProps {
  value: Mood;
  Icon: React.FC<{ size: number; color: string }>;
  label: string;
  selected: boolean;
  onPress: (m: Mood) => void;
}

function MoodChip({ value, Icon, label, selected, onPress }: MoodChipProps) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      style={({ pressed }) => [
        styles.moodChip,
        selected && styles.moodChipSelected,
        pressed && styles.moodChipPressed,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Icon size={18} color={selected ? C.gold400 : C.fgSecondary} />
      <Text style={[styles.moodChipText, selected && styles.moodChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.base900,
  },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: S[5],
    paddingTop: S[2],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    marginBottom: S[4],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.base800,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    backgroundColor: C.base700,
  },
  eyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: S[3],
  },
  headline: {
    fontFamily: Font.display,
    fontSize: Size['2xl'] + 2,
    color: C.fgPrimary,
    fontStyle: 'italic',
    lineHeight: (Size['2xl'] + 2) * 1.15,
    marginBottom: S[6],
  },
  dayCard: {
    backgroundColor: C.base800,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: S[4],
    marginBottom: S[6],
    gap: S[4],
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCardEyebrow: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  dayCardCounter: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.gold400,
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressSegFilled: {
    backgroundColor: C.gold500,
  },
  progressSegEmpty: {
    backgroundColor: C.base700,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: S[1],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xl,
    color: C.fgPrimary,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 10,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: S[3],
    marginTop: S[2],
  },
  moodRow: {
    flexDirection: 'row',
    gap: S[2] + 2,
    marginBottom: S[5],
  },
  moodChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.base800,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    paddingVertical: S[3] + 2,
    gap: 6,
    minHeight: 72,
  },
  moodChipSelected: {
    borderColor: C.gold500,
    backgroundColor: 'rgba(201,162,39,0.10)',
  },
  moodChipPressed: {
    backgroundColor: C.base700,
  },
  moodChipText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgSecondary,
  },
  moodChipTextSelected: {
    color: C.fgPrimary,
  },
  input: {
    backgroundColor: C.base800,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    paddingHorizontal: S[4],
    paddingVertical: S[3] + 2,
    fontFamily: Font.body,
    fontSize: Size.base,
    fontStyle: 'italic',
    color: C.fgPrimary,
    minHeight: 56,
  },
  bottomBar: {
    paddingHorizontal: S[5],
    paddingTop: S[3],
    backgroundColor: C.base900,
  },
  saveBtn: {
    backgroundColor: C.gold500,
    borderRadius: 28,
    paddingVertical: S[4] + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.base900,
    letterSpacing: 0.3,
  },
});
