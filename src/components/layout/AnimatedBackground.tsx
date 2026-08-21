import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { AppTheme } from '../../../budgetModel';

type Props = {
  theme: AppTheme;
};

export const AnimatedBackground: React.FC<Props> = ({ theme }) => {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <View style={[styles.wash, { backgroundColor: theme.orbPrimary }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wash: {
    position: 'absolute',
    width: 360,
    height: 220,
    borderRadius: 180,
    top: -150,
    right: -120,
    opacity: 0.28,
  },
});
