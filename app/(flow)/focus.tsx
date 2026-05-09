import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { X, Pause, Play, Check } from 'lucide-react-native';
import { useTaskStore } from '../../store/tasks';
import { PomoDots } from '../../components/atoms/PomoDots';
import { C, WORK_TYPE_COLORS } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

const POMO_DURATION = 25 * 60; // seconds
const RING_RADIUS = 100;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function FocusScreen() {
  const router = useRouter();
  const { focusTask, markCurrentTaskDone } = useTaskStore();

  const [secondsLeft, setSecondsLeft] = useState(POMO_DURATION);
  const [running, setRunning] = useState(true);
  const [completedPomos, setCompletedPomos] = useState(0);
  const [currentPomo, setCurrentPomo] = useState(0);
  const [notes, setNotes] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const task = focusTask?.task;
  const workColor = task ? WORK_TYPE_COLORS[task.workType] : C.gold500;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            // Pomo complete
            setCompletedPomos((c) => c + 1);
            setCurrentPomo((c) => c + 1);
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

  const progress = 1 - secondsLeft / POMO_DURATION;
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const handleDone = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    markCurrentTaskDone();
    router.replace('/(flow)/done');
  }, [markCurrentTaskDone, router]);

  const handleAbandon = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.back();
  }, [router]);

  if (!task) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.errorText}>No task selected.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.abandonBtn}
            onPress={handleAbandon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={C.fgTertiary} />
          </TouchableOpacity>
          <Text style={styles.topLabel}>Focus</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Task */}
        <View style={styles.taskSection}>
          <View style={[styles.workTypePill, { backgroundColor: `${workColor}22` }]}>
            <Text style={[styles.workTypeText, { color: workColor }]}>{task.workType}</Text>
          </View>
          <Text style={styles.taskTitle}>{task.text}</Text>
        </View>

        {/* Ring timer */}
        <View style={styles.ringWrapper}>
          <Svg width={240} height={240} viewBox="0 0 240 240">
            {/* Track */}
            <Circle
              cx={120}
              cy={120}
              r={RING_RADIUS}
              stroke={C.base700}
              strokeWidth={8}
              fill="none"
            />
            {/* Progress */}
            <Circle
              cx={120}
              cy={120}
              r={RING_RADIUS}
              stroke={workColor}
              strokeWidth={8}
              fill="none"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              transform={`rotate(-90 120 120)`}
            />
          </Svg>
          <View style={styles.ringInner}>
            <Text style={styles.timerText}>
              {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </Text>
            <Text style={styles.timerSub}>remaining</Text>
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
              ? `Segment ${currentPomo + 1} of 4`
              : 'All segments done!'}
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Capture thoughts while you work…"
            placeholderTextColor={C.fgTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() => setRunning((r) => !r)}
            activeOpacity={0.8}
          >
            {running ? (
              <Pause size={20} color={C.fgPrimary} />
            ) : (
              <Play size={20} color={C.fgPrimary} />
            )}
            <Text style={styles.pauseText}>{running ? 'Pause' : 'Resume'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Check size={20} color={C.base900} />
            <Text style={styles.doneBtnText}>Mark done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.base900,
  },
  content: {
    paddingHorizontal: S[5],
    paddingBottom: S[8],
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.base800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.sm,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  taskSection: {
    alignItems: 'center',
    gap: S[2],
    marginBottom: S[5],
    width: '100%',
  },
  workTypePill: {
    paddingHorizontal: S[3],
    paddingVertical: S[1],
    borderRadius: 20,
  },
  workTypeText: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskTitle: {
    fontFamily: Font.display,
    fontSize: Size.xl,
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: 28,
  },
  ringWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[5],
    position: 'relative',
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontFamily: Font.mono,
    fontSize: Size['3xl'],
    color: C.fgPrimary,
    letterSpacing: 2,
  },
  timerSub: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    color: C.fgTertiary,
    marginTop: 2,
  },
  dotsRow: {
    alignItems: 'center',
    gap: S[2],
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
    fontSize: Size.sm,
    color: C.fgTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    minHeight: 96,
  },
  controls: {
    flexDirection: 'row',
    gap: S[3],
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
    paddingVertical: S[4],
    borderWidth: 1,
    borderColor: C.borderDefault,
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
    paddingVertical: S[4],
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
