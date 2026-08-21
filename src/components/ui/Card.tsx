import React from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { spacing, borderRadius, shadows } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';

export type CardVariant = 'surface' | 'accent' | 'filled';

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
  variant = 'surface',
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
    // Surface Card - Default, clean look
    variantSurface: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: `${theme.primary}33`, // 20% opacity
      ...shadows.sm,
    },
    // Accent Card - Highlight sections
    variantAccent: {
      backgroundColor: `${theme.primary}14`, // 8% opacity
      borderWidth: 1,
      borderColor: `${theme.primary}4D`, // 30% opacity
    },
    // Filled Card - Status/Important
    variantFilled: {
      backgroundColor: theme.primary,
      borderWidth: 0,
      ...shadows.md,
    },
  });

  const variantStyles = {
    surface: styles.variantSurface,
    accent: styles.variantAccent,
    filled: styles.variantFilled,
  }[variant];

  return (
    <View
      style={[styles.card, variantStyles, style]}
      testID={testID}
    >
      {children}
    </View>
  );
};
