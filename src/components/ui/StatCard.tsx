import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { spacing, borderRadius, typography } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';
import { Card } from './Card';

export type StatType = 'default' | 'positive' | 'alert' | 'neutral';

interface StatCardProps {
  label: string;
  value: string | number;
  type?: StatType;
  subtext?: string;
  style?: ViewStyle;
  testID?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  type = 'default',
  subtext,
  style,
  testID,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      color: theme.textMuted,
    },
    value: {
      fontSize: typography.fontSize.xxxl,
      fontWeight: typography.fontWeight.black,
      fontFamily: 'Courier New, monospace',
      letterSpacing: -1.2,
      marginBottom: subtext ? spacing.sm : 0,
    },
    subtext: {
      fontSize: typography.fontSize.sm,
      color: theme.textMuted,
    },
  });

  const getValueColor = () => {
    switch (type) {
      case 'positive':
        return theme.success;
      case 'alert':
        return theme.error;
      case 'neutral':
        return theme.textMuted;
      default:
        return theme.text;
    }
  };

  return (
    <Card variant="filled" padding={spacing.lg} style={[styles.container, style]} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: getValueColor() }]}>
        {value}
      </Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </Card>
  );
};
