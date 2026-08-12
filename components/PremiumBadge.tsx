import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PremiumBadgeProps = {
  accent: string;
  accentText: string;
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ accent, accentText }) => (
  <View style={[styles.badge, { backgroundColor: accent }]}>
    <Text style={[styles.text, { color: accentText }]}>PRO</Text>
  </View>
);
