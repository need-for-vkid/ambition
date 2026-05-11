import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DayMode } from '../../types/task';
import { C } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';
import { S } from '../../constants/spacing';

interface Props {
  value: DayMode;
  onChange: (mode: DayMode) => void;
}

const OPTIONS: { value: DayMode; label: string; hours: string }[] = [
  { value: 'light', label: 'Light', hours: '4h' },
  { value: 'normal', label: 'Normal', hours: '6h' },
  { value: 'productive', label: 'Productive', hours: '8h' },
];

export function DayModePill({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && styles.chipPressed,
            ]}
            onPress={() => {
              if (active) return;
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }
              onChange(opt.value);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${opt.label} day · ${opt.hours} focus`}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {opt.label}
            </Text>
            <Text style={[styles.chipHours, active && styles.chipHoursActive]}>
              {opt.hours}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: C.base700,
    borderRadius: 14,
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: C.borderDefault,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: S[2] + 2,
    borderRadius: 11,
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: C.gold500,
  },
  chipPressed: {
    backgroundColor: C.base600,
  },
  chipLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: Size.xs,
    color: C.fgSecondary,
    letterSpacing: 0.5,
  },
  chipLabelActive: {
    color: C.base900,
  },
  chipHours: {
    fontFamily: Font.mono,
    fontSize: 10,
    color: C.fgTertiary,
    letterSpacing: 0.5,
  },
  chipHoursActive: {
    color: 'rgba(1, 32, 32, 0.7)',
  },
});
