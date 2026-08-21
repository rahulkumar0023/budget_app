import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIsoDateForMonth,
  ensureCurrentMonth,
  getTotalIncome,
  getTotalSpent,
  getProjectedSpend,
  isValidMonthId,
  normalizeBudgetAppState,
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
  kind: overrides.kind,
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
      appThemeId: 'indigo',
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

test('ensureCurrentMonth creates the current month when only a future plan exists', () => {
  const state: BudgetAppState = {
    version: 5,
    activeMonthId: 'missing',
    months: [buildMonth({ id: '2026-06' })],
    accounts: [],
    goals: [],
    preferences: {
      appThemeId: 'indigo',
      cloudBackupEnabled: false,
      currencyCode: 'EUR',
      languageCode: 'en',
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    },
    updatedAt: Date.now(),
  };

  const ensured = ensureCurrentMonth(state, new Date('2026-04-09T12:00:00.000Z'));

  assert.equal(ensured.activeMonthId, '2026-04');
  assert.ok(ensured.months.some((month) => month.id === '2026-04'));
  assert.ok(ensured.months.some((month) => month.id === '2026-06'));
});

test('normalizeBudgetAppState drops malformed restored data without inventing recent locales', () => {
  const normalized = normalizeBudgetAppState(
    {
      version: 5,
      activeMonthId: '2026-04',
      months: [
        {
          ...buildMonth({
            categories: [buildCategory()],
            transactions: [
              buildTransaction(),
              buildTransaction({ id: 'bad-date', happenedAt: 'not-a-date' }),
              buildTransaction({ id: 'orphan', categoryId: 'missing-category' }),
            ],
          }),
          monthlyLimit: 'Infinity',
        },
        buildMonth({ id: '2026-13' }),
      ],
      accounts: [],
      goals: [],
      preferences: {
        appThemeId: 'indigo',
        cloudBackupEnabled: false,
        currencyCode: 'EUR',
        languageCode: 'en',
        recentCurrencyCodes: ['EUR', 'invalid', 'EUR'],
        recentLanguageCodes: ['fr', 'invalid', 'fr'],
      },
      updatedAt: Date.now(),
    },
    new Date('2026-04-09T12:00:00.000Z'),
  );

  assert.ok(normalized);
  assert.deepEqual(normalized.preferences.recentCurrencyCodes, ['EUR']);
  assert.deepEqual(normalized.preferences.recentLanguageCodes, ['fr']);
  assert.equal(normalized.months.length, 1);
  assert.equal(normalized.months[0]?.monthlyLimit, '0');
  assert.deepEqual(normalized.months[0]?.transactions.map((transaction) => transaction.id), ['txn-1']);
});

test('isValidMonthId accepts calendar months only', () => {
  assert.equal(isValidMonthId('2026-01'), true);
  assert.equal(isValidMonthId('2026-12'), true);
  assert.equal(isValidMonthId('2026-00'), false);
  assert.equal(isValidMonthId('2026-13'), false);
  assert.equal(isValidMonthId('April 2026'), false);
});

test('income is tracked separately and does not inflate spending', () => {
  const month = buildMonth({
    categories: [buildCategory()],
    transactions: [
      buildTransaction({ amount: 100, kind: 'expense' }),
      buildTransaction({
        id: 'income-1',
        kind: 'income',
        categoryId: '__income__',
        amount: 500,
        note: 'Salary',
      }),
    ],
  });

  assert.equal(getTotalSpent(month), 100);
  assert.equal(getTotalIncome(month), 500);
});
