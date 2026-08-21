import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  ViewStyle,
  Animated,
} from 'react-native';
import { spacing, borderRadius, typography, componentSizes, shadows } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';

interface TransactionItemProps {
  icon: string; // Emoji or category icon
  name: string;
  category: string;
  amount: number;
  isIncome?: boolean;
  date: string; // e.g., "Today", "Yesterday", "3 days ago"
  onPress?: () => void;
  onDelete?: () => void;
  testID?: string;
  style?: ViewStyle;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  icon,
  name,
  category,
  amount,
  isIncome = false,
  date,
  onPress,
  onDelete,
  testID,
  style,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    leftContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.lg,
    },
    iconContainer: {
      width: componentSizes.buttonHeight,
      height: componentSizes.buttonHeight,
      borderRadius: borderRadius.md,
      backgroundColor: theme.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 24,
    },
    infoContainer: {
      flex: 1,
    },
    name: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: theme.text,
      marginBottom: 2,
    },
    meta: {
      fontSize: typography.fontSize.sm,
      color: theme.textMuted,
    },
    rightContainer: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    amount: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.bold,
      fontFamily: 'Courier New, monospace',
      marginBottom: 2,
    },
    amountExpense: {
      color: theme.error,
    },
    amountIncome: {
      color: theme.success,
    },
    actionMenu: {
      marginLeft: spacing.md,
      padding: spacing.sm,
    },
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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

  const formattedAmount = isIncome
    ? `+$${Math.abs(amount).toFixed(2)}`
    : `-$${Math.abs(amount).toFixed(2)}`;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, style]}
        testID={testID}
      >
        <View style={styles.leftContainer}>
          <View style={styles.iconContainer}>
            <Text style={{ fontSize: 24 }}>{icon}</Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.meta}>
              {category} • {date}
            </Text>
          </View>
        </View>

        <View style={styles.rightContainer}>
          <Text
            style={[
              styles.amount,
              isIncome ? styles.amountIncome : styles.amountExpense,
            ]}
          >
            {formattedAmount}
          </Text>
          {onDelete && (
            <Pressable
              onPress={onDelete}
              style={styles.actionMenu}
              hitSlop={8}
            >
              <Text style={{ fontSize: 14, color: theme.textMuted }}>✕</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};
