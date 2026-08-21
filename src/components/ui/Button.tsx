import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  useColorScheme,
  Animated,
} from 'react-native';
import { colors, spacing, borderRadius, componentSizes, typography, shadows } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: string;
  style?: ViewStyle;
  testID?: string;
  hapticFeedback?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  children,
  style,
  testID,
  hapticFeedback = true,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    button: {
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.6 : 1,
      ...shadows.sm,
    },
    // Size variants
    buttonSmall: {
      height: componentSizes.buttonHeightSmall,
      paddingHorizontal: spacing.lg,
    },
    buttonMedium: {
      height: componentSizes.buttonHeight,
      paddingHorizontal: spacing.xl,
    },
    buttonLarge: {
      height: componentSizes.buttonHeight + 8,
      paddingHorizontal: spacing.xxl,
    },
    // Variant styles
    variantPrimary: {
      backgroundColor: theme.primary,
    },
    variantSecondary: {
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    variantTertiary: {
      backgroundColor: 'transparent',
    },
    variantGhost: {
      backgroundColor: 'transparent',
    },
    variantDanger: {
      backgroundColor: theme.error,
    },
    text: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
    },
    textPrimary: {
      color: colors.white,
    },
    textSecondary: {
      color: theme.text,
    },
    textDanger: {
      color: colors.white,
    },
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const sizeStyles = {
    small: styles.buttonSmall,
    medium: styles.buttonMedium,
    large: styles.buttonLarge,
  }[size];

  const variantStyles = {
    primary: styles.variantPrimary,
    secondary: styles.variantSecondary,
    tertiary: styles.variantTertiary,
    ghost: styles.variantGhost,
    danger: styles.variantDanger,
  }[variant];

  const textColorStyles = {
    primary: styles.textPrimary,
    secondary: styles.textSecondary,
    tertiary: styles.textSecondary,
    ghost: styles.textSecondary,
    danger: styles.textDanger,
  }[variant];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => {
          if (!disabled && !loading) {
            onPress();
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[styles.button, sizeStyles, variantStyles, style]}
        testID={testID}
      >
        <Text style={[styles.text, textColorStyles]}>
          {loading ? '...' : children}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
