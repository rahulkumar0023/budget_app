import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { spacing, borderRadius, typography } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';

interface TransactionStatsBarProps {
  totalSpent: number;
  totalIncome: number;
  transactionCount: number;
  largestExpense: number;
  averagePerDay: number;
  style?: ViewStyle;
  testID?: string;
}

export const TransactionStatsBar: React.FC<TransactionStatsBarProps> = ({
  totalSpent,
  totalIncome,
  transactionCount,
  largestExpense,
  averagePerDay,
  style,
  testID,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    scrollContainer: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    statPill: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minWidth: 140,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statLabel: {
      fontSize: typography.fontSize.xs,
      color: theme.textMuted,
      textTransform: 'uppercase',
      fontWeight: typography.fontWeight.semibold,
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    statValue: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      fontFamily: 'Courier New, monospace',
      color: theme.text,
    },
  });

  const stats = [
    { label: 'Spent', value: `$${totalSpent.toFixed(0)}`, color: theme.error },
    { label: 'Income', value: `$${totalIncome.toFixed(0)}`, color: theme.success },
    { label: 'Entries', value: transactionCount, color: theme.text },
    { label: 'Largest', value: `$${largestExpense.toFixed(0)}`, color: theme.warning },
    { label: 'Daily Avg', value: `$${averagePerDay.toFixed(0)}`, color: theme.text },
  ];

  return (
    <View style={[styles.container, style]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        scrollEventThrottle={16}
      >
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statPill}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
