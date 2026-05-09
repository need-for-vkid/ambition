import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Importance } from '../../types/task';
import { IMPORTANCE_COLORS } from '../../constants/colors';

interface Props {
  importance: Importance;
  size?: number;
}

export function PriorityDot({ importance, size = 8 }: Props) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: IMPORTANCE_COLORS[importance],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});
