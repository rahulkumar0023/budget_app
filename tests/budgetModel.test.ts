import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIsoDateForMonth,
  ensureCurrentMonth,
  getProjectedSpend,
  type BudgetAppState,
  type Category,
  type MonthRecord,
  type Transaction,
} from '../budgetModel';

const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: overrides.id ?? 'cat-1',
  name: overrides.name ?? 'Recurring',
  planned: overrides.planned ?? 1000,
  subcategories: overrides.subcategories ?? [],
  bucket: overrides.bucket ?? 'needs',
  themeId: overrides.themeId ?? 'citrus',
  recurring: overrides.recurring ?? true,
});

const buildTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: overrides.id ?? 'txn-1',
  categoryId: overrides.categoryId ?? 'cat-1',
  subcategory: overrides.subcategory,
  accountId: overrides.accountId,
  amount: overrides.amount ?? 100,
  note: overrides.note ?? 'Test',
  happenedAt: overrides.happenedAt ?? buildIsoDateForMonth('2026-04', 1),
  recurring: overrides.recurring ?? false,
});

const buildMonth = (overrides: Partial<MonthRecord> = {}): MonthRecord => ({
  id: overrides.id ?? '2026-04',
  currencyCode: overrides.currencyCode ?? 'EUR',
  monthlyLimit: overrides.monthlyLimit ?? '1500',
  categories: overrides.categories ?? [],
  transactions: overrides.transactions ?? [],
  updatedAt: overrides.updatedAt ?? Date.now(),
});

test('getProjectedSpend keeps fixed recurring categories as monthly commitments', () => {
  const recurringCategory = buildCategory({
    id: 'rent',
    name: 'Rent',
    planned: 1000,
    recurring: true,
  });
  const flexibleCategory = buildCategory({
    id: 'groceries',
    name: 'Groceries',
    planned: 300,
    recurring: false,
    bucket: 'wants',
  });

  const month = buildMonth({
    id: '2026-04',
    categories: [recurringCategory, flexibleCategory],
    transactions: [
      buildTransaction({
        id: 'rent-txn',
        categoryId: 'rent',
        amount: 500,
        recurring: true,
        happenedAt: buildIsoDateForMonth('2026-04', 1),
      }),
      buildTransaction({
        id: 'groceries-txn',
        categoryId: 'groceries',
        amount: 30,
        recurring: false,
        happenedAt: buildIsoDateForMonth('2026-04', 10),
      }),
    ],
  });

  const projected = getProjectedSpend(month, new Date('2026-04-10T12:00:00.000Z'));

  assert.equal(projected, 1090);
});

test('ensureCurrentMonth rolls recurring categories and transactions into the next month', () => {
  const marchCategory = buildCategory({
    id: 'rent',
    name: 'Rent',
    planned: 900,
    recurring: true,
  });
  const marchTransaction = buildTransaction({
    id: 'march-rent',
    categoryId: 'rent',
    amount: 900,
    recurring: true,
    happenedAt: buildIsoDateForMonth('2026-03', 3),
  });

  const state: BudgetAppState = {
    version: 5,
    activeMonthId: '2026-03',
    months: [
      buildMonth({
        id: '2026-03',
        monthlyLimit: '1500',
        categories: [marchCategory],
        transactions: [marchTransaction],
      }),
    ],
    accounts: [],
    goals: [],
    preferences: {
      appThemeId: 'lagoon',
      cloudBackupEnabled: false,
      currencyCode: 'EUR',
      languageCode: 'en',
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    },
    updatedAt: Date.now(),
  };

  const ensured = ensureCurrentMonth(state, new Date('2026-04-09T12:00:00.000Z'));
  const aprilMonth = ensured.months.find((month) => month.id === '2026-04');

  assert.ok(aprilMonth);
  assert.equal(aprilMonth?.categories.length, 1);
  assert.equal(aprilMonth?.transactions.length, 1);
  assert.equal(aprilMonth?.categories[0]?.name, 'Rent');
  assert.match(aprilMonth?.transactions[0]?.happenedAt ?? '', /^2026-04-03T/);
});
