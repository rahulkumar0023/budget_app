import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  ScrollView,
  Pressable,
} from 'react-native';
import { spacing, borderRadius, typography } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';

export interface CategoryFilterOption {
  id: string;
  name: string;
  icon?: string;
  amount?: number;
}

interface CategoryFilterProps {
  categories: CategoryFilterOption[];
  selectedCategories: Set<string>;
  onCategoryToggle: (categoryId: string) => void;
  style?: ViewStyle;
  testID?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
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
    label: {
      fontSize: typography.fontSize.xs,
      color: theme.textMuted,
      textTransform: 'uppercase',
      fontWeight: typography.fontWeight.bold,
      letterSpacing: 0.5,
      marginBottom: spacing.md,
    },
    scrollContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    chip: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    chipInactive: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
    },
    chipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    chipText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
    },
    chipTextInactive: {
      color: theme.text,
    },
    chipTextActive: {
      color: theme.surface,
    },
    chipIcon: {
      fontSize: 14,
    },
    amountText: {
      fontSize: typography.fontSize.xs,
      color: theme.textMuted,
      marginLeft: spacing.xs,
    },
  });

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Text style={styles.label}>Filter by Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        scrollEventThrottle={16}
      >
        {categories.map((category) => {
          const isSelected = selectedCategories.has(category.id);
          return (
            <Pressable
              key={category.id}
              onPress={() => onCategoryToggle(category.id)}
              style={[
                styles.chip,
                isSelected ? styles.chipActive : styles.chipInactive,
              ]}
            >
              {category.icon && (
                <Text style={styles.chipIcon}>{category.icon}</Text>
              )}
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {category.name}
              </Text>
              {category.amount !== undefined && (
                <Text
                  style={[
                    styles.amountText,
                    isSelected && { color: theme.surface },
                  ]}
                >
                  ${category.amount.toFixed(0)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};
