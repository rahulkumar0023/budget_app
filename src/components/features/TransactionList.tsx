import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  ListRenderItem,
  Text,
} from 'react-native';
import { spacing, borderRadius } from '../../styles/designTokens';
import { lightTheme, darkTheme } from '../../styles/designTokens';
import { TransactionItem } from '../ui';

export interface Transaction {
  id: string;
  icon: string;
  name: string;
  category: string;
  amount: number;
  isIncome?: boolean;
  date: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
  onTransactionDelete?: (transactionId: string) => void;
  emptyMessage?: string;
  style?: ViewStyle;
  testID?: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onTransactionPress,
  onTransactionDelete,
  emptyMessage = 'No transactions yet',
  style,
  testID,
}) => {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      paddingVertical: spacing.lg,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
    },
    emptyText: {
      color: theme.textMuted,
      fontSize: 16,
    },
    sectionHeader: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });

  // Group transactions by date if needed
  const renderTransaction: ListRenderItem<Transaction> = ({ item }) => (
    <TransactionItem
      icon={item.icon}
      name={item.name}
      category={item.category}
      amount={item.amount}
      isIncome={item.isIncome}
      date={item.date}
      onPress={() => onTransactionPress?.(item)}
      onDelete={() => onTransactionDelete?.(item.id)}
      testID={`transaction-${item.id}`}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmpty}
        scrollEnabled={false}
      />
    </View>
  );
};
