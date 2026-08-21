import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { spacing, borderRadius, typography, shadows } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';
import { StatCard, ProgressBar } from '../ui';

interface BudgetDashboardProps {
  monthLabel: string;
  totalBudget: number;
  totalSpent: number;
  categoryBreakdown?: { name: string; spent: number; budget: number }[];
  style?: ViewStyle;
  testID?: string;
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  monthLabel,
  totalBudget,
  totalSpent,
  categoryBreakdown = [],
  style,
  testID,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const remaining = totalBudget - totalSpent;
  const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const status = percentageUsed > 90 ? 'error' : percentageUsed > 75 ? 'warning' : 'success';

  const progressStatus = status === 'error' ? 'error' : status === 'warning' ? 'warning' : 'success';

  const styles = StyleSheet.create({
    container: {
      padding: spacing.lg,
    },
    heroCard: {
      backgroundColor: theme.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    monthChip: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    monthChipText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: theme.textMuted,
    },
    statusBadge: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    statusBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    amountSection: {
      marginBottom: spacing.lg,
    },
    amountLabel: {
      fontSize: typography.fontSize.sm,
      color: theme.textMuted,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
      fontWeight: typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    amountValue: {
      fontSize: 48,
      fontWeight: typography.fontWeight.black,
      fontFamily: 'Courier New, monospace',
      letterSpacing: -1.2,
      color: theme.text,
      marginBottom: spacing.md,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.xl,
    },
    statItem: {
      flex: 1,
    },
    categoryBreakdownTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: theme.text,
      marginBottom: spacing.lg,
      marginTop: spacing.xl,
    },
    categoryItem: {
      marginBottom: spacing.lg,
    },
    categoryName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: theme.text,
      marginBottom: spacing.sm,
    },
    categoryMeta: {
      fontSize: typography.fontSize.sm,
      color: theme.textMuted,
      marginBottom: spacing.md,
    },
  });

  const getStatusColor = () => {
    switch (status) {
      case 'error':
        return theme.error;
      case 'warning':
        return theme.warning;
      default:
        return theme.success;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'error':
        return 'Over Budget';
      case 'warning':
        return 'Approaching Limit';
      default:
        return 'On Track';
    }
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.heroCard}>
        <View style={styles.header}>
          <View style={styles.monthChip}>
            <Text style={styles.monthChipText}>{monthLabel}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Budget Remaining</Text>
          <Text style={[styles.amountValue, { color: remaining >= 0 ? theme.success : theme.error }]}>
            ${Math.abs(remaining).toFixed(0)}
          </Text>
        </View>

        <ProgressBar
          percentage={percentageUsed}
          status={progressStatus}
          animated
        />

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <StatCard
              label="Spent"
              value={`$${totalSpent.toFixed(0)}`}
              type="default"
            />
          </View>
          <View style={styles.statItem}>
            <StatCard
              label="Budget"
              value={`$${totalBudget.toFixed(0)}`}
              type="neutral"
            />
          </View>
          <View style={styles.statItem}>
            <StatCard
              label="Used"
              value={`${Math.round(percentageUsed)}%`}
              type="default"
            />
          </View>
        </View>
      </View>

      {categoryBreakdown.length > 0 && (
        <View>
          <Text style={styles.categoryBreakdownTitle}>Category Breakdown</Text>
          {categoryBreakdown.map((category) => {
            const catPercentage = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
            const catStatus = catPercentage > 90 ? 'error' : catPercentage > 75 ? 'warning' : 'success';

            return (
              <View key={category.name} style={styles.categoryItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={{ fontSize: typography.fontSize.sm, fontFamily: 'Courier New', color: theme.text }}>
                    ${category.spent.toFixed(0)} / ${category.budget.toFixed(0)}
                  </Text>
                </View>
                <ProgressBar
                  percentage={catPercentage}
                  status={catStatus}
                  animated
                  height={4}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
