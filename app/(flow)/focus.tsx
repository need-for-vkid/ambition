import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { X, Pause, Play, Check } from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { PomoDots } from '../../components/atoms/PomoDots';
import { useT } from '../../lib/i18n';
import { C, WORK_TYPE_COLORS } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

const POMO_DURATION = 25 * 60; // seconds
const RING_RADIUS = 110;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

export default function FocusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tr = useT();
  const { focusTask, markCurrentTaskDone } = useTaskStore();

  const [secondsLeft, setSecondsLeft] = useState(POMO_DURATION);
  const [running, setRunning] = useState(true);
  const [completedPomos, setCompletedPomos] = useState(0);
  const [currentPomo, setCurrentPomo] = useState(0);
  const [notes, setNotes] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const task = focusTask?.task;
  const workColor = task ? WORK_TYPE_COLORS[task.workType] : C.gold500;

  const whyNowText: string | null = (() => {
    const reason = focusTask?.reason;
    if (!reason) return null;
    switch (reason.type) {
      case 'peak_window':
        return `${task?.workType ?? ''} — ${tr('focus.why.peak_window')}`;
      case 'urgent_hours':
        return reason.hoursLeft <= 0
          ? tr('focus.why.due_now')
          : `${tr('focus.why.due_in')} ${reason.hoursLeft}${tr('focus.why.hours')}`;
      case 'overdue':
        return tr('focus.why.overdue');
      case 'carry_over':
        return reason.days === 1
          ? tr('focus.why.from_yesterday')
          : `${tr('focus.why.carried')} ${reason.days} ${tr('focus.why.days')}`;
      case 'high_importance':
        return tr('focus.why.high_importance');
      case 'forced':
        return tr('focus.why.forced');
      default:
        return null;
    }
  })();

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            setCompletedPomos((c) => c + 1);
            setCurrentPomo((c) => c + 1);
            impact(Haptics.ImpactFeedbackStyle.Heavy);
            return POMO_DURATION;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Keyboard listener — manually track height to push content up.
  // Works reliably in Expo Go where KeyboardAvoidingView has platform-specific quirks.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Scroll to the very bottom so Notes + controls sit above the keyboard
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const progress = 1 - secondsLeft / POMO_DURATION;
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const handleDone = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    impact(Haptics.ImpactFeedbackStyle.Heavy);
    await markCurrentTaskDone({
      notes: notes.trim() || undefined,
      pomosCount: completedPomos,
    });
    router.replace('/(flow)/done');
  }, [markCurrentTaskDone, notes, completedPomos, router]);

  const handleAbandon = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    impact();
    router.back();
  }, [router]);

  if (!task) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.errorText}>No task selected.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // When keyboard open, drop bottom safe-area inset (keyboard is now there).
  // Otherwise the keyboard height + inset would double-pad.
  const bottomPad = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="focusBg" cx="50%" cy="35%" r="80%">
            <Stop offset="0" stopColor={C.base700} stopOpacity="1" />
            <Stop offset="1" stopColor={C.base900} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#focusBg)" />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + S[4] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [styles.abandonBtn, pressed && styles.abandonBtnPressed]}
              onPress={handleAbandon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel focus"
            >
              <X size={20} color={C.fgSecondary} />
            </Pressable>
            <Text style={styles.topLabel}>{tr('focus.title')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Task */}
          <View style={styles.taskSection}>
            <View style={[styles.workTypePill, { backgroundColor: `${workColor}22` }]}>
              <Text style={[styles.workTypeText, { color: workColor }]}>{task.workType}</Text>
            </View>
            <Text style={styles.taskTitle}>{task.text}</Text>
            {whyNowText && (
              <Text style={styles.whyNow}>{whyNowText}</Text>
            )}
          </View>

          {/* Ring timer */}
          <View style={styles.ringWrapper}>
            <Svg width={260} height={260} viewBox="0 0 260 260">
              <Defs>
                <RadialGradient id="ringHalo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0.55" stopColor={workColor} stopOpacity="0.18" />
                  <Stop offset="1" stopColor={workColor} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={130} cy={130} r={130} fill="url(#ringHalo)" />
              <Circle
                cx={130}
                cy={130}
                r={RING_RADIUS}
                stroke={C.base700}
                strokeWidth={6}
                fill="none"
              />
              <Circle
                cx={130}
                cy={130}
                r={RING_RADIUS}
                stroke={workColor}
                strokeWidth={6}
                fill="none"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                transform={`rotate(-90 130 130)`}
              />
            </Svg>
            <View style={styles.ringInner}>
              <Text style={styles.timerText}>
                {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </Text>
              <Text style={styles.timerSub}>{running ? tr('focus.remaining') : tr('focus.paused')}</Text>
            </View>
          </View>

          {/* Pomo dots */}
          <View style={styles.dotsRow}>
            <PomoDots
              total={4}
              completed={completedPomos}
              current={currentPomo < 4 ? currentPomo : 3}
            />
            <Text style={styles.dotsLabel}>
              {currentPomo < 4
                ? `${tr('focus.segment')} ${currentPomo + 1} ${tr('focus.of')} 4`
                : tr('focus.all_segments')}
            </Text>
          </View>

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>{tr('focus.notes')}</Text>
            <TextInput
              style={styles.notesInput}
              placeholder={tr('focus.notes_placeholder')}
              placeholderTextColor={C.fgTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 250);
              }}
            />
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <Pressable
              style={({ pressed }) => [styles.pauseBtn, pressed && styles.pauseBtnPressed]}
              onPress={() => {
                impact();
                setRunning((r) => !r);
              }}
              accessibilityRole="button"
            >
              {running ? (
                <Pause size={18} color={C.fgPrimary} />
              ) : (
                <Play size={18} color={C.fgPrimary} />
              )}
              <Text style={styles.pauseText}>{running ? tr('focus.pause') : tr('focus.resume')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
              onPress={handleDone}
              accessibilityRole="button"
            >
              <Check size={18} color={C.base900} />
              <Text style={styles.doneBtnText}>{tr('focus.mark_done')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.base900 },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: S[5],
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: S[4],
  },
  abandonBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.base800,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonBtnPressed: {
    backgroundColor: C.base700,
  },
  topLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  taskSection: {
    alignItems: 'center',
    gap: S[2],
    marginBottom: S[5],
    paddingHorizontal: S[3],
  },
  workTypePill: {
    paddingHorizontal: S[3] + 2,
    paddingVertical: S[1] + 2,
    borderRadius: 20,
  },
  workTypeText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  taskTitle: {
    fontFamily: Font.display,
    fontSize: Size.xl + 2,
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: (Size.xl + 2) * 1.25,
  },
  whyNow: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  ringWrapper: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[5],
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontFamily: Font.mono,
    fontSize: Size['3xl'] + 2,
    color: C.fgPrimary,
    letterSpacing: 2,
  },
  timerSub: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  dotsRow: {
    alignItems: 'center',
    gap: S[2] + 2,
    marginBottom: S[5],
  },
  dotsLabel: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
  },
  notesSection: {
    width: '100%',
    gap: S[2],
    marginBottom: S[5],
  },
  notesLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  notesInput: {
    backgroundColor: C.base800,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderDefault,
    padding: S[4],
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
    minHeight: 100,
    lineHeight: Size.base * 1.5,
  },
  controls: {
    flexDirection: 'row',
    gap: S[2] + 2,
    width: '100%',
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    backgroundColor: C.base800,
    borderRadius: 14,
    paddingVertical: S[4] + 2,
    borderWidth: 1,
    borderColor: C.borderDefault,
    minHeight: 56,
  },
  pauseBtnPressed: {
    backgroundColor: C.base700,
    transform: [{ scale: 0.98 }],
  },
  pauseText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.fgPrimary,
  },
  doneBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    backgroundColor: C.gold500,
    borderRadius: 14,
    paddingVertical: S[4] + 2,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: C.gold500,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  doneBtnPressed: {
    backgroundColor: C.gold400,
    transform: [{ scale: 0.98 }],
  },
  doneBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.base,
    color: C.base900,
  },
  errorText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgTertiary,
    textAlign: 'center',
    marginTop: S[12],
  },
  backBtn: {
    marginTop: S[4],
    alignSelf: 'center',
    backgroundColor: C.base700,
    borderRadius: 10,
    paddingHorizontal: S[5],
    paddingVertical: S[3],
  },
  backBtnText: {
    fontFamily: Font.body,
    fontSize: Size.base,
    color: C.fgPrimary,
  },
});
