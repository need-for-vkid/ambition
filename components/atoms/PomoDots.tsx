import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { C } from '../../constants/colors';

interface Props {
  total?: number;
  completed: number;
  current: number;
}

export function PomoDots({ total = 4, completed, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} state={i < completed ? 'done' : i === current ? 'active' : 'idle'} />
      ))}
    </View>
  );
}

function Dot({ state }: { state: 'done' | 'active' | 'idle' }) {
  const animStyle = useAnimatedStyle(() => ({
    width: withSpring(state === 'active' ? 24 : 8, { damping: 12 }),
    opacity: withSpring(state === 'idle' ? 0.3 : 1),
  }));

  const bg =
    state === 'done' ? C.gold500 : state === 'active' ? C.gold400 : C.fgTertiary;

  return (
    <Animated.View style={[styles.dot, animStyle, { backgroundColor: bg }]} />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
