import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type CategoryBudget = {
  id: string;
  name: string;
  planned: number;
  spent: number;
};

const starterBudgets: CategoryBudget[] = [
  { id: '1', name: 'Groceries', planned: 500, spent: 320 },
  { id: '2', name: 'Transport', planned: 150, spent: 85 },
  { id: '3', name: 'Dining Out', planned: 200, spent: 140 },
];

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

export default function App() {
  const [monthlyLimit, setMonthlyLimit] = useState('1500');
  const [budgets, setBudgets] = useState<CategoryBudget[]>(starterBudgets);
  const [name, setName] = useState('');
  const [planned, setPlanned] = useState('');

  const totalPlanned = useMemo(
    () => budgets.reduce((sum, item) => sum + item.planned, 0),
    [budgets],
  );

  const totalSpent = useMemo(
    () => budgets.reduce((sum, item) => sum + item.spent, 0),
    [budgets],
  );

  const monthlyLimitNumber = Number(monthlyLimit) || 0;
  const remaining = monthlyLimitNumber - totalSpent;

  const addCategory = () => {
    const plannedAmount = Number(planned);
    if (!name.trim() || Number.isNaN(plannedAmount) || plannedAmount <= 0) {
      return;
    }

    const newCategory: CategoryBudget = {
      id: String(Date.now()),
      name: name.trim(),
      planned: plannedAmount,
      spent: 0,
    };

    setBudgets((current) => [newCategory, ...current]);
    setName('');
    setPlanned('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Monthly Budget Tracker</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Monthly budget limit</Text>
          <TextInput
            style={styles.input}
            value={monthlyLimit}
            onChangeText={setMonthlyLimit}
            keyboardType="numeric"
            placeholder="Enter total monthly budget"
          />

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Planned</Text>
              <Text style={styles.summaryValue}>{currency(totalPlanned)}</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text style={styles.summaryValue}>{currency(totalSpent)}</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text
                style={[
                  styles.summaryValue,
                  remaining < 0 ? styles.negative : styles.positive,
                ]}
              >
                {currency(remaining)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Add category budget</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Category name"
          />
          <TextInput
            style={styles.input}
            value={planned}
            onChangeText={setPlanned}
            keyboardType="numeric"
            placeholder="Planned amount"
          />
          <Pressable style={styles.button} onPress={addCategory}>
            <Text style={styles.buttonText}>Add budget</Text>
          </Pressable>
        </View>

        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const left = item.planned - item.spent;
            return (
              <View style={styles.budgetRow}>
                <View>
                  <Text style={styles.budgetName}>{item.name}</Text>
                  <Text style={styles.budgetMeta}>
                    Planned: {currency(item.planned)} | Spent: {currency(item.spent)}
                  </Text>
                </View>
                <Text style={[styles.leftValue, left < 0 ? styles.negative : styles.positive]}>
                  {currency(left)}
                </Text>
              </View>
            );
          }}
        />
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderColor: '#d9dce3',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  summaryRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    marginTop: 2,
    fontWeight: '700',
    fontSize: 16,
  },
  positive: {
    color: '#1e8f4a',
  },
  negative: {
    color: '#cf2f2f',
  },
  button: {
    backgroundColor: '#2952e3',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 24,
  },
  budgetRow: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetName: {
    fontWeight: '700',
    marginBottom: 2,
  },
  budgetMeta: {
    color: '#555',
    fontSize: 12,
  },
  leftValue: {
    fontWeight: '700',
  },
});
