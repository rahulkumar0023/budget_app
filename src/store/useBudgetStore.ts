import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type BudgetAppState,
  type MonthRecord,
  type BankAccount,
  type Goal,
  type Transaction,
  type Category,
  createInitialBudgetState,
} from '../../budgetModel';

interface BudgetState extends BudgetAppState {
  setMonths: (months: MonthRecord[]) => void;
  setAccounts: (accounts: BankAccount[]) => void;
  setGoals: (goals: Goal[]) => void;
  setActiveMonthId: (monthId: string) => void;
  updateState: (partial: Partial<BudgetAppState>) => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      ...createInitialBudgetState(),
      setMonths: (months) => set({ months, updatedAt: Date.now() }),
      setAccounts: (accounts) => set({ accounts, updatedAt: Date.now() }),
      setGoals: (goals) => set({ goals, updatedAt: Date.now() }),
      setActiveMonthId: (activeMonthId) => set({ activeMonthId, updatedAt: Date.now() }),
      updateState: (partial) => set({ ...partial, updatedAt: Date.now() }),
    }),
    {
      name: 'budget-buddy-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
