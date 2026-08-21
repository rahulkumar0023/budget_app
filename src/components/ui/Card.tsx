import React from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { spacing, borderRadius, shadows } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';

export type CardVariant = 'elevated' | 'filled' | 'outlined';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: number;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'filled',
  padding = spacing.lg,
  style,
  onPress,
  testID,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const styles = StyleSheet.create({
    card: {
      borderRadius: borderRadius.lg,
      padding,
    },
    variantElevated: {
      backgroundColor: theme.surface,
      ...shadows.md,
    },
    variantFilled: {
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    variantOutlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
    },
  });

  const variantStyles = {
    elevated: styles.variantElevated,
    filled: styles.variantFilled,
    outlined: styles.variantOutlined,
  }[variant];

  if (onPress) {
    return (
      <View
        style={[styles.card, variantStyles, style]}
        testID={testID}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[styles.card, variantStyles, style]}
      testID={testID}
    >
      {children}
    </View>
  );
};
