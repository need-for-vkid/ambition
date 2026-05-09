import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../../constants/colors';
import { Font, Size } from '../../constants/typography';

interface Props {
  label: string;
  color?: string;
  bg?: string;
}

export function Badge({ label, color = C.fgSecondary, bg = C.base700 }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Font.body,
    fontSize: Size.xs,
    letterSpacing: 0.3,
  },
});
