import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { C } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'highlight' | 'subtle';
}

export function CardSurface({ children, style, variant = 'default' }: Props) {
  return (
    <View style={[styles.base, styles[variant], style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.base700,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderDefault,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  default: {},
  highlight: {
    borderColor: C.borderGold,
    backgroundColor: 'rgba(201,162,39,0.07)',
  },
  subtle: {
    backgroundColor: C.base800,
    borderColor: C.borderSubtle,
  },
});
