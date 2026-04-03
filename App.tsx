import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { extractText as extractPdfText, isAvailable as isPdfTextExtractAvailable } from 'expo-pdf-text-extract';
import { StatusBar } from 'expo-status-bar';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type DimensionValue,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  addMonths,
  appThemeOrder,
  appThemes,
  bankAccountKindMeta,
  bankAccountKindOrder,
  categoryBucketMeta,
  categoryBucketOrder,
  categoryThemes,
  clamp,
  compareMonthIds,
  copyMonthBudget,
  currencyOptions,
  createId,
  createInitialBudgetState,
  currency,
  ensureCurrentMonth,
  featuredCurrencyCodes,
  featuredLanguageCodes,
  formatTransactionDate,
  getCategoryGlyph,
  getCategorySummaries,
  getDaysInMonth,
  getLocaleTag,
  getMonthId,
  getMonthLabel,
  getMonthName,
  getPaceDrivenSpend,
  getProjectedCategorySpend,
  getProjectedSpend,
  getUserStorageKey,
  inferCategoryBucket,
  languageOptions,
  type MonthRecord,
  getTotalPlanned,
  getTotalSpent,
  parseMonthId,
  LOCAL_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  normalizeBudgetAppState,
  parseBankAccountCustomKinds,
  parseSubcategoryInput,
  quickPresets,
  rollMonthForward,
  sortTransactions,
  themeCycle,
  type AppTheme,
  type AppThemeId,
  type BankAccount,
  type BankAccountKind,
  type BudgetAppState,
  type Category,
  type CategoryBucket,
  type CategorySummary,
  type CurrencyCode,
  type Goal,
  type LanguageCode,
  type ThemeId,
  type Transaction,
} from './budgetModel';
import {
  buildBudgetPdfHtml,
  buildImportableBudgetPdfBase64,
  buildLedgerCsv,
  buildWorkbookBase64,
  importBudgetPdfBase64,
  importISaveMoneyPdfText,
  importLedgerCsv,
  importWorkbookBase64,
} from './dataTransfer';
import {
  createBudgetPasswordAccount,
  getBudgetAiExpenseAssist,
  getBudgetAiImportCleanup,
  getBudgetAiMonthPlanner,
  ensureBudgetCloudUser,
  getBudgetAiMonthlyReview,
  loadBudgetCloudState,
  saveBudgetCloudState,
  signInBudgetPasswordUser,
  signOutBudgetUser,
  subscribeToBudgetAuth,
  type BudgetAiExpenseAssistResponse,
  type BudgetAiImportCleanupResponse,
  type BudgetAiMonthPlannerResponse,
  type BudgetAiMonthlyReviewResponse,
  type BudgetAuthUser,
} from './firebaseClient';

type SaveState = 'hydrating' | 'saving' | 'saved' | 'error';
type CloudState = 'connecting' | 'syncing' | 'synced' | 'local-only';
type TransactionFilter = 'all' | 'over' | 'healthy';
type TransactionSort = 'recent' | 'highest';
type ActivityScope = 'today' | 'week' | 'month';
type AuthMode = 'create' | 'signin';
type ScreenId = 'home' | 'spend' | 'plan' | 'insights' | 'settings';
type SettingsSection = 'appearance' | 'locale' | 'accounts' | 'cloud' | 'data';
type InsightWindow = 'quarter' | 'half' | 'year';
type InsightSpendMode = 'all' | 'adjustable';
type AlertTone = 'good' | 'warning' | 'alert';
type BudgetSetupStep = 'limit' | 'categories' | 'review';
type CategoryBucketMode = 'auto' | 'manual';

type InsightMonthSummary = {
  id: string;
  label: string;
  currencyCode: CurrencyCode;
  spent: number;
  planned: number;
  fixedSpent: number;
  flexibleSpent: number;
  utilizationRatio: number;
  fixedShareRatio: number;
  adjustableRatio: number;
};

type InsightSuggestion = {
  tone: AlertTone;
  title: string;
  body: string;
};

type MonthlyAiReview = BudgetAiMonthlyReviewResponse & {
  generatedAt: number;
};

type ExpenseAiAssist = BudgetAiExpenseAssistResponse & {
  generatedAt: number;
};

type ImportCleanupReview = BudgetAiImportCleanupResponse & {
  generatedAt: number;
};

type MonthPlannerReview = BudgetAiMonthPlannerResponse & {
  generatedAt: number;
};

type WeeklyInsightRow = {
  label: string;
  shortLabel: string;
  total: number;
  fixed: number;
  flexible: number;
  state: 'completed' | 'current' | 'upcoming';
};

type InsightSummary = {
  averageMonthlySpend: number;
  averageMonthlyFixedSpend: number;
  averageMonthlyFlexibleSpend: number;
  averagePlanUsageRatio: number;
  averageFixedShareRatio: number;
  averageAdjustableUsageRatio: number;
  months: InsightMonthSummary[];
  overBudgetMonths: number;
  recurringShare: number;
  currencyCodes: CurrencyCode[];
  isMixedCurrency: boolean;
  topAdjustableCategory: { name: string; spent: number } | null;
  totalAdjustableSpent: number;
  totalFixedSpent: number;
  totalFlexibleSpent: number;
  totalPlanned: number;
  totalSpent: number;
  flexibleTrendDelta: number | null;
  trendDelta: number | null;
};

type ForecastAlert = {
  tone: AlertTone;
  title: string;
  body: string;
};

type ForecastSnapshot = {
  averageDailySpend: number;
  confidenceLabel: string;
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  dominantCategory:
    | {
        name: string;
        planned: number;
        projectedDelta: number;
        projectedSpend: number;
        spent: number;
      }
    | null;
  forecastBase: number;
  isCurrentMonth: boolean;
  projectedDelta: number;
  projectedSpend: number;
  runwayDays: number | null;
  safeDailyBudget: number | null;
  spendGap: number;
  spendToDateTarget: number;
  totalPlanned: number;
  totalSpent: number;
};

const insightWindowMeta: Record<InsightWindow, { label: string; months: number }> = {
  quarter: { label: 'Quarter', months: 3 },
  half: { label: '6 months', months: 6 },
  year: { label: 'Year', months: 12 },
};

const budgetSetupStepMeta: Record<
  BudgetSetupStep,
  { label: string; title: string; subtitle: string }
> = {
  limit: {
    label: 'Budget',
    title: 'Budget amount',
    subtitle: 'Set the monthly amount first. Categories and subcategories come next.',
  },
  categories: {
    label: 'Categories',
    title: 'Add categories and subcategories',
    subtitle: 'Start broad, then add subcategories whenever you want more detail.',
  },
  review: {
    label: 'Review',
    title: 'Check the setup',
    subtitle: 'Look for missing savings, oversized lanes, and whether the month is balanced.',
  },
};

const budgetSetupSteps: BudgetSetupStep[] = ['limit', 'categories', 'review'];

const budgetBucketTargetRatio: Record<CategoryBucket, number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
};

const categoryGlyphs = {
  bag: '👜',
  car: '🚗',
  cart: '🛒',
  cup: '☕',
  dot: '•',
  home: '🏠',
  plus: '+',
  wifi: '📱',
} as const;

const getMonthBounds = (monthId: string) => {
  const monthDate = parseMonthId(monthId);
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12, 0, 0);

  return { start, end };
};

const clampDateToMonth = (date: Date, monthId: string) => {
  const { start, end } = getMonthBounds(monthId);
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

  if (normalized.getTime() < start.getTime()) {
    return start;
  }

  if (normalized.getTime() > end.getTime()) {
    return end;
  }

  return normalized;
};

const getDefaultExpenseDate = (monthId: string, referenceDate = new Date()) =>
  clampDateToMonth(referenceDate, monthId);

const formatExpenseDate = (date: Date, locale = getLocaleTag()) =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

const maxRecentSelectorItems = 6;

const pushRecentCode = <T extends string>(codes: T[], nextCode: T) =>
  [nextCode, ...codes.filter((code) => code !== nextCode)].slice(0, maxRecentSelectorItems);

const resolveOptionsByCodes = <T extends { code: string }>(options: T[], codes: string[]) => {
  const optionByCode = new Map(options.map((option) => [option.code, option]));
  const seenCodes = new Set<string>();

  return codes.reduce<T[]>((result, code) => {
    const option = optionByCode.get(code);

    if (!option || seenCodes.has(option.code)) {
      return result;
    }

    seenCodes.add(option.code);
    result.push(option);
    return result;
  }, []);
};

const sortOptionsByLabel = <T extends { label: string }>(options: T[]) =>
  [...options].sort((left, right) => left.label.localeCompare(right.label));

const matchesSelectorQuery = (
  normalizedQuery: string,
  ...values: Array<string | undefined>
) =>
  normalizedQuery.length === 0 ||
  values.some((value) => value?.toLowerCase().includes(normalizedQuery));

const getCategoryIcon = (name: string) => categoryGlyphs[getCategoryGlyph(name)];

const getSuggestedBudgetSetupStep = (
  monthlyLimit: number,
  categoryCount: number,
  allocationDifference: number,
): BudgetSetupStep => {
  if (monthlyLimit <= 0) {
    return 'limit';
  }

  if (categoryCount === 0) {
    return 'categories';
  }

  return Math.abs(allocationDifference) <= Math.max(monthlyLimit * 0.05, 25)
    ? 'review'
    : 'categories';
};

const getInsightWeekBucket = (date: Date) => {
  const day = date.getDate();

  if (day <= 7) {
    return 0;
  }

  if (day <= 14) {
    return 1;
  }

  if (day <= 21) {
    return 2;
  }

  return 3;
};

const getStartOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getEndOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const getStartOfWeek = (date: Date) => {
  const next = getStartOfDay(date);
  const dayOffset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - dayOffset);
  return next;
};

const getEndOfWeek = (date: Date) => {
  const next = getStartOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
};

const matchesActivityScope = (
  happenedAt: string,
  scope: ActivityScope,
  referenceDate = new Date(),
) => {
  if (scope === 'month') {
    return true;
  }

  const transactionDate = new Date(happenedAt);

  if (scope === 'today') {
    return (
      transactionDate >= getStartOfDay(referenceDate) &&
      transactionDate <= getEndOfDay(referenceDate)
    );
  }

  return (
    transactionDate >= getStartOfWeek(referenceDate) &&
    transactionDate <= getEndOfWeek(referenceDate)
  );
};

const buildWeeklyInsightRows = (
  month: MonthRecord,
  referenceDate = new Date(),
): WeeklyInsightRow[] => {
  const currentMonthId = getMonthId(referenceDate);
  const monthPosition = compareMonthIds(month.id, currentMonthId);
  const currentWeekBucket = getInsightWeekBucket(referenceDate);

  return Array.from({ length: 4 }, (_, index) => {
    const weekTransactions = month.transactions.filter(
      (transaction) => getInsightWeekBucket(new Date(transaction.happenedAt)) === index,
    );
    const fixed = weekTransactions
      .filter((transaction) => transaction.recurring)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const flexible = weekTransactions
      .filter((transaction) => !transaction.recurring)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const state =
      monthPosition > 0
        ? 'upcoming'
        : monthPosition < 0
          ? 'completed'
          : index < currentWeekBucket
            ? 'completed'
            : index === currentWeekBucket
              ? 'current'
              : 'upcoming';

    return {
      label: `Week ${index + 1}`,
      shortLabel: `W${index + 1}`,
      total: fixed + flexible,
      fixed,
      flexible,
      state,
    };
  });
};

const buildInsightSummary = (
  months: MonthRecord[],
  previousMonths: MonthRecord[],
  localeTag: string,
): InsightSummary => {
  const mapMonthSummary = (month: MonthRecord): InsightMonthSummary => {
    const fixedSpent = month.transactions
      .filter((transaction) => transaction.recurring)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const flexibleSpent = month.transactions
      .filter((transaction) => !transaction.recurring)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const planned = getTotalPlanned(month);
    const spent = fixedSpent + flexibleSpent;

    return {
      id: month.id,
      label: getMonthLabel(month.id, localeTag),
      currencyCode: month.currencyCode,
      spent,
      planned,
      fixedSpent,
      flexibleSpent,
      utilizationRatio: planned > 0 ? spent / planned : 0,
      fixedShareRatio: spent > 0 ? fixedSpent / spent : 0,
      adjustableRatio: planned > 0 ? flexibleSpent / planned : 0,
    };
  };

  const monthSummaries = months.map(mapMonthSummary);
  const previousMonthSummaries = previousMonths.map(mapMonthSummary);
  const currencyCodes = [...new Set(monthSummaries.map((month) => month.currencyCode))];
  const previousCurrencyCodes = [...new Set(previousMonthSummaries.map((month) => month.currencyCode))];
  const isMixedCurrency = currencyCodes.length > 1;
  const comparableCurrencyCode = currencyCodes.length === 1 ? currencyCodes[0] : null;
  const canCompareWindows =
    Boolean(comparableCurrencyCode) &&
    previousCurrencyCodes.length === 1 &&
    previousCurrencyCodes[0] === comparableCurrencyCode;
  const totalSpent = monthSummaries.reduce((sum, month) => sum + month.spent, 0);
  const totalPlanned = monthSummaries.reduce((sum, month) => sum + month.planned, 0);
  const totalFixedSpent = monthSummaries.reduce((sum, month) => sum + month.fixedSpent, 0);
  const totalFlexibleSpent = monthSummaries.reduce((sum, month) => sum + month.flexibleSpent, 0);
  const previousSpend = previousMonthSummaries.reduce((sum, month) => sum + month.spent, 0);
  const previousFlexibleSpend = previousMonthSummaries.reduce(
    (sum, month) => sum + month.flexibleSpent,
    0,
  );
  const overBudgetMonths = monthSummaries.filter((month) => {
    const monthPlan = month.planned;
    return monthPlan > 0 && month.spent > monthPlan;
  }).length;
  const adjustableCategoryTotals = new Map<string, number>();
  let totalAdjustableSpent = 0;

  months.forEach((month) => {
    const categoriesById = new Map(month.categories.map((category) => [category.id, category]));

    month.transactions.forEach((transaction) => {
      if (transaction.recurring) {
        return;
      }

      const category = categoriesById.get(transaction.categoryId);

      if (!category || category.bucket === 'savings') {
        return;
      }

      totalAdjustableSpent += transaction.amount;
      adjustableCategoryTotals.set(
        category.name,
        (adjustableCategoryTotals.get(category.name) ?? 0) + transaction.amount,
      );
    });
  });

  const topAdjustableCategoryEntry = [...adjustableCategoryTotals.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];
  const averagePlanUsageRatio =
    monthSummaries.length > 0
      ? monthSummaries.reduce((sum, month) => sum + month.utilizationRatio, 0) / monthSummaries.length
      : 0;
  const averageFixedShareRatio =
    monthSummaries.length > 0
      ? monthSummaries.reduce((sum, month) => sum + month.fixedShareRatio, 0) / monthSummaries.length
      : 0;
  const averageAdjustableUsageRatio =
    monthSummaries.length > 0
      ? monthSummaries.reduce((sum, month) => sum + month.adjustableRatio, 0) / monthSummaries.length
      : 0;

  return {
    averageMonthlySpend: !isMixedCurrency && months.length > 0 ? totalSpent / months.length : 0,
    averageMonthlyFixedSpend:
      !isMixedCurrency && months.length > 0 ? totalFixedSpent / months.length : 0,
    averageMonthlyFlexibleSpend:
      !isMixedCurrency && months.length > 0 ? totalFlexibleSpent / months.length : 0,
    averagePlanUsageRatio,
    averageFixedShareRatio,
    averageAdjustableUsageRatio,
    months: [...monthSummaries].reverse(),
    flexibleTrendDelta:
      canCompareWindows && previousFlexibleSpend > 0
        ? (totalFlexibleSpent - previousFlexibleSpend) / previousFlexibleSpend
        : null,
    overBudgetMonths,
    recurringShare: averageFixedShareRatio,
    currencyCodes,
    isMixedCurrency,
    topAdjustableCategory: !isMixedCurrency && topAdjustableCategoryEntry
      ? { name: topAdjustableCategoryEntry[0], spent: topAdjustableCategoryEntry[1] }
      : null,
    totalAdjustableSpent: !isMixedCurrency ? totalAdjustableSpent : 0,
    totalFixedSpent: !isMixedCurrency ? totalFixedSpent : 0,
    totalFlexibleSpent: !isMixedCurrency ? totalFlexibleSpent : 0,
    totalPlanned: !isMixedCurrency ? totalPlanned : 0,
    totalSpent: !isMixedCurrency ? totalSpent : 0,
    trendDelta:
      canCompareWindows && previousSpend > 0 ? (totalSpent - previousSpend) / previousSpend : null,
  };
};

const buildInsightSuggestions = (
  summary: InsightSummary,
  window: InsightWindow,
): InsightSuggestion[] => {
  const suggestions: InsightSuggestion[] = [];
  const windowLabel = insightWindowMeta[window].label.toLowerCase();
  const expectedMonths = insightWindowMeta[window].months;
  const currencyLabel =
    summary.currencyCodes.length <= 2
      ? summary.currencyCodes.join(' + ')
      : `${summary.currencyCodes.length} currencies`;
  const adjustableShare =
    summary.topAdjustableCategory && summary.totalAdjustableSpent > 0
      ? summary.topAdjustableCategory.spent / summary.totalAdjustableSpent
      : 0;

  if (summary.months.length === 0) {
    return [
      {
        tone: 'good',
        title: 'Add more history first',
        body: 'Import or track more months to unlock a clearer long-range read.',
      },
    ];
  }

  if (summary.months.length < expectedMonths) {
    suggestions.push({
      tone: 'good',
      title: 'This read is still early',
      body: `Only ${summary.months.length} of ${expectedMonths} months are recorded in this ${windowLabel} view, so treat trend calls as directional for now.`,
    });
  }

  if (summary.isMixedCurrency) {
    suggestions.push({
      tone: 'good',
      title: 'Mixed currencies are shown as ratios',
      body: `${currencyLabel} appear in this window, so the chart compares plan usage and fixed-vs-flex mix instead of adding different currencies together.`,
    });

    if (summary.overBudgetMonths > 0) {
      suggestions.push({
        tone: 'warning',
        title: `${summary.overBudgetMonths} month${summary.overBudgetMonths === 1 ? '' : 's'} ran hot`,
        body: 'Use over-plan months as the signal here. The app avoids fake total comparisons when currencies differ.',
      });
    }

    if (summary.averageAdjustableUsageRatio > 0.22) {
      suggestions.push({
        tone: 'warning',
        title: 'Adjustable spend is taking real room',
        body: `${Math.round(summary.averageAdjustableUsageRatio * 100)}% of the average month plan is flexible spend. That is the part worth tightening before fixed recurring costs.`,
      });
    }

    if (suggestions.length === 1) {
      suggestions.push({
        tone: 'good',
        title: 'The mix looks stable',
        body: 'Recurring costs are being treated as baseline load, and there is no strong flexible-spend spike across the recorded months.',
      });
    }

    return suggestions.slice(0, 3);
  }

  if (summary.recurringShare >= 0.55) {
    suggestions.push({
      tone: 'good',
      title: 'Recurring costs form the baseline',
      body: `${Math.round(summary.recurringShare * 100)}% of this ${windowLabel} spend is recurring. Treat that as baseline load, then focus any changes on flexible categories or on resizing the monthly target.`,
      });
  }

  if (summary.totalFlexibleSpent <= 0) {
    suggestions.push({
      tone: 'good',
      title: 'No flexible pattern yet',
      body: 'This window only shows fixed or recurring costs so far. Add day-to-day expenses before expecting cut suggestions.',
    });

    return suggestions.slice(0, 3);
  }

  if (summary.topAdjustableCategory && adjustableShare >= 0.25) {
    suggestions.push({
      tone: 'warning',
      title: `Best place to adjust: ${summary.topAdjustableCategory.name}`,
      body: `${Math.round(adjustableShare * 100)}% of adjustable spend sits there. If you want to change the outcome, start here before touching fixed recurring costs.`,
    });
  }

  if (summary.overBudgetMonths > 0) {
    suggestions.push({
      tone: summary.recurringShare >= 0.7 ? 'warning' : 'alert',
      title: `${summary.overBudgetMonths} over-plan month${summary.overBudgetMonths === 1 ? '' : 's'}`,
      body:
        summary.recurringShare >= 0.7
          ? 'The overage is happening in a window that is mostly fixed. Review the recurring target or the total monthly cap rather than assuming there is easy spend to cut.'
          : 'The month is slipping past plan. Check the largest flexible categories first and keep recurring commitments separate from day-to-day cuts.',
    });
  }

  if (summary.flexibleTrendDelta !== null && summary.flexibleTrendDelta > 0.12) {
    suggestions.push({
      tone: 'warning',
      title: 'Flexible spend is rising',
      body: `Adjustable spending is up ${Math.round(summary.flexibleTrendDelta * 100)}% versus the previous ${windowLabel} window.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      tone: 'good',
      title: 'This window looks steady',
      body:
        summary.totalAdjustableSpent > 0
          ? 'Fixed costs are stable and the adjustable categories do not show a clear spike right now.'
          : 'This window is mostly fixed commitments, so there is no obvious cut suggestion to force.',
    });
  }

  return suggestions.slice(0, 3);
};

const buildForecastSnapshot = (
  month: MonthRecord,
  categorySummaries: CategorySummary[],
  monthlyLimit: number,
  totalPlanned: number,
  referenceDate = new Date(),
): ForecastSnapshot => {
  const isCurrentMonth = month.id === getMonthId(referenceDate);
  const daysInMonth = getDaysInMonth(month.id);
  const daysElapsed = isCurrentMonth ? Math.max(referenceDate.getDate(), 1) : daysInMonth;
  const daysRemaining = isCurrentMonth ? Math.max(daysInMonth - daysElapsed, 0) : 0;
  const totalSpent = getTotalSpent(month);
  const forecastBase = monthlyLimit > 0 ? monthlyLimit : totalPlanned;
  const projectedSpend = isCurrentMonth ? getProjectedSpend(month, referenceDate) : totalSpent;
  const paceDrivenSpend = isCurrentMonth ? getPaceDrivenSpend(month) : totalSpent;
  const averageDailySpend = daysElapsed > 0 ? paceDrivenSpend / daysElapsed : 0;
  const recurringProjectedSpend = isCurrentMonth
    ? Math.max(projectedSpend - averageDailySpend * daysInMonth, 0)
    : 0;
  const paceForecastBase =
    isCurrentMonth && forecastBase > 0 ? Math.max(forecastBase - recurringProjectedSpend, 0) : forecastBase;
  const spendToDateTarget = paceForecastBase > 0 ? (paceForecastBase / daysInMonth) * daysElapsed : 0;
  const spendGap = paceDrivenSpend - spendToDateTarget;
  const safeDailyBudget =
    isCurrentMonth && forecastBase > 0 && daysRemaining > 0
      ? Math.max(forecastBase - totalSpent, 0) / daysRemaining
      : null;
  const runwayDays =
    isCurrentMonth && averageDailySpend > 0 && forecastBase > totalSpent
      ? (forecastBase - totalSpent) / averageDailySpend
      : null;
  const progress = daysElapsed / daysInMonth;
  const confidenceLabel = !isCurrentMonth
    ? 'Closed month'
    : progress < 0.25
      ? 'Early read'
      : progress < 0.65
        ? 'Medium confidence'
        : 'High confidence';
  const dominantCategory =
    categorySummaries
      .map((summary) => {
        const projectedCategorySpend = isCurrentMonth
          ? getProjectedCategorySpend(month, summary.category, referenceDate)
          : summary.spent;

        return {
          name: summary.category.name,
          planned: summary.category.planned,
          projectedDelta: projectedCategorySpend - summary.category.planned,
          projectedSpend: projectedCategorySpend,
          spent: summary.spent,
        };
      })
      .sort(
        (left, right) =>
          right.projectedDelta - left.projectedDelta || right.projectedSpend - left.projectedSpend,
      )[0] ?? null;

  return {
    averageDailySpend,
    confidenceLabel,
    daysElapsed,
    daysInMonth,
    daysRemaining,
    dominantCategory,
    forecastBase,
    isCurrentMonth,
    projectedDelta: forecastBase > 0 ? projectedSpend - forecastBase : 0,
    projectedSpend,
    runwayDays,
    safeDailyBudget,
    spendGap,
    spendToDateTarget,
    totalPlanned,
    totalSpent,
  };
};

const buildForecastAlerts = (
  snapshot: ForecastSnapshot,
  categoryCount: number,
  overCount: number,
  currencyCode: CurrencyCode,
  localeTag: string,
): ForecastAlert[] => {
  const nextAlerts: ForecastAlert[] = [];
  const format = (value: number) => currency(value, currencyCode, localeTag);
  const warningThreshold = Math.max(snapshot.forecastBase * 0.03, 15);
  const alertThreshold = Math.max(snapshot.forecastBase * 0.05, 25);

  if (categoryCount === 0) {
    return [
      {
        tone: 'good',
        title: 'Start with a budget lane',
        body: 'Add a category and monthly target to unlock stronger forecasts and risk alerts.',
      },
    ];
  }

  if (!snapshot.isCurrentMonth) {
    if (snapshot.forecastBase > 0 && snapshot.totalSpent > snapshot.forecastBase) {
      nextAlerts.push({
        tone: 'alert',
        title: 'This month closed over plan',
        body: `${format(snapshot.totalSpent - snapshot.forecastBase)} above the month target.`,
      });
    } else if (snapshot.forecastBase > 0) {
      nextAlerts.push({
        tone: 'good',
        title: 'This month closed within plan',
        body: `${format(Math.max(snapshot.forecastBase - snapshot.totalSpent, 0))} of buffer remained at month end.`,
      });
    }

    if (
      snapshot.dominantCategory &&
      snapshot.dominantCategory.projectedDelta > Math.max(snapshot.dominantCategory.planned * 0.08, 10)
    ) {
      nextAlerts.push({
        tone: 'warning',
        title: `${snapshot.dominantCategory.name} finished hottest`,
        body: `That category ended about ${format(snapshot.dominantCategory.projectedDelta)} above plan.`,
      });
    }

    if (nextAlerts.length === 0) {
      nextAlerts.push({
        tone: 'good',
        title: 'This month is recorded',
        body: 'Use the history and insight views to compare it against newer months.',
      });
    }

    return nextAlerts.slice(0, 3);
  }

  if (snapshot.forecastBase <= 0) {
    nextAlerts.push({
      tone: 'warning',
      title: 'Set a monthly limit',
      body: 'Add an overall month target so pace and forecast warnings have a real baseline.',
    });
  }

  if (snapshot.forecastBase > 0 && snapshot.projectedDelta > alertThreshold) {
    nextAlerts.push({
      tone: 'alert',
      title: 'Projected to finish over plan',
      body: `At the current pace the month lands about ${format(snapshot.projectedDelta)} over target.`,
    });
  }

  if (snapshot.forecastBase > 0 && snapshot.spendGap > warningThreshold) {
    nextAlerts.push({
      tone: 'warning',
      title: 'Flexible spend is running ahead',
      body: `Variable spending is ${format(snapshot.spendGap)} ahead of the ideal pace for this point in the month.`,
    });
  }

  if (snapshot.safeDailyBudget !== null) {
    if (snapshot.safeDailyBudget === 0 && snapshot.daysRemaining > 0) {
      nextAlerts.push({
        tone: 'alert',
        title: 'No daily room left',
        body: 'There is no remaining daily buffer unless spending pauses or the month target changes.',
      });
    } else if (
      snapshot.averageDailySpend > 0 &&
      snapshot.safeDailyBudget > 0 &&
      snapshot.safeDailyBudget < snapshot.averageDailySpend * 0.8
    ) {
      nextAlerts.push({
        tone: 'warning',
        title: 'Daily room is tightening',
        body: `To finish inside plan, keep the remaining days near ${format(snapshot.safeDailyBudget)} per day.`,
      });
    }
  }

  if (
    snapshot.dominantCategory &&
    snapshot.dominantCategory.projectedDelta > Math.max(snapshot.dominantCategory.planned * 0.08, 10)
  ) {
    nextAlerts.push({
      tone:
        snapshot.dominantCategory.projectedDelta > Math.max(snapshot.dominantCategory.planned * 0.18, 25)
          ? 'alert'
          : 'warning',
      title: `${snapshot.dominantCategory.name} is the pressure point`,
      body: `It is trending toward ${format(snapshot.dominantCategory.projectedSpend)} for the month.`,
    });
  } else if (overCount > 0) {
    nextAlerts.push({
      tone: 'warning',
      title: `${overCount} categories already need attention`,
      body: 'The hottest lanes are already over plan, even before the month closes.',
    });
  }

  if (nextAlerts.length === 0) {
    nextAlerts.push({
      tone: 'good',
      title: 'You are on a steady pace',
      body: snapshot.forecastBase > 0
        ? `${format(Math.max(snapshot.forecastBase - snapshot.projectedSpend, 0))} of forecast buffer is still intact.`
        : 'Most categories are staying controlled and the month still looks steady.',
    });
  }

  return nextAlerts.slice(0, 3);
};

const decodeBase64ToBytes = (base64: string) => {
  const sanitized = base64.replace(/\s+/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of sanitized) {
    if (character === '=') {
      break;
    }

    const index = alphabet.indexOf(character);
    if (index === -1) {
      continue;
    }

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
};

type PdfJsModule = {
  getDocument: (source: Record<string, unknown>) => { promise: Promise<any> };
};

let cachedPdfJsModule: PdfJsModule | null = null;

const resolvePdfJsModule = (loaded: unknown): PdfJsModule | null => {
  if (loaded && typeof loaded === 'object') {
    const direct = loaded as { getDocument?: unknown; default?: unknown; pdfjsLib?: unknown };

    if (typeof direct.getDocument === 'function') {
      return direct as PdfJsModule;
    }

    if (direct.default && typeof (direct.default as { getDocument?: unknown }).getDocument === 'function') {
      return direct.default as PdfJsModule;
    }

    if (direct.pdfjsLib && typeof (direct.pdfjsLib as { getDocument?: unknown }).getDocument === 'function') {
      return direct.pdfjsLib as PdfJsModule;
    }
  }

  return null;
};

const loadPdfJsModule = (): PdfJsModule => {
  if (cachedPdfJsModule) {
    return cachedPdfJsModule;
  }

  let lastError: unknown = null;

  try {
    const modernPdfJs = resolvePdfJsModule(require('pdfjs-dist/build/pdf.js'));
    if (modernPdfJs) {
      cachedPdfJsModule = modernPdfJs;
      return modernPdfJs;
    }
  } catch (error) {
    lastError = error;
  }

  try {
    const legacyPdfJs = resolvePdfJsModule(require('pdfjs-dist/legacy/build/pdf.js'));
    if (legacyPdfJs) {
      cachedPdfJsModule = legacyPdfJs;
      return legacyPdfJs;
    }
  } catch (error) {
    lastError = error;
  }

  throw new Error(
    lastError instanceof Error
      ? `PDF parser could not be loaded: ${lastError.message}`
      : 'PDF parser could not be loaded.',
  );
};

const extractPdfTextWithPdfJs = async (uri: string) => {
  const pdfjs = loadPdfJsModule();
  const base64Content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdfBytes = decodeBase64ToBytes(base64Content);
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str?: string }) => (typeof item.str === 'string' ? item.str : ''))
      .filter(Boolean)
      .join('\n');

    pages.push(pageText);
    page.cleanup();
  }

  return pages.join('\n');
};

const getAuthErrorMessage = (error: unknown) => {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email already has an account. Sign in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Those sign-in details did not match an account.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts for now. Try again in a moment.';
    case 'auth/credential-already-in-use':
      return 'Those credentials are already attached to another account.';
    case 'auth/network-request-failed':
      return 'The network request failed. Check your connection and retry.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled for this project.';
    default:
      return 'The account action could not be completed.';
  }
};

export default function App() {
  const [appState, setAppState] = useState<BudgetAppState>(() =>
    createInitialBudgetState(new Date()),
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('hydrating');
  const [cloudState, setCloudState] = useState<CloudState>('connecting');
  const [authUser, setAuthUser] = useState<BudgetAuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('create');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date());
  const [expenseRecurring, setExpenseRecurring] = useState(false);
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [selectedCategoryDetailId, setSelectedCategoryDetailId] = useState<string | null>(null);

  const [accountName, setAccountName] = useState('');
  const [accountKinds, setAccountKinds] = useState<BankAccountKind[]>(['spending']);
  const [accountCustomKindsText, setAccountCustomKindsText] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);

  const [categoryName, setCategoryName] = useState('');
  const [categoryPlanned, setCategoryPlanned] = useState('');
  const [categorySubcategoriesText, setCategorySubcategoriesText] = useState('');
  const [categoryBucket, setCategoryBucket] = useState<CategoryBucket>('wants');
  const [categoryBucketMode, setCategoryBucketMode] = useState<CategoryBucketMode>('auto');
  const [categoryRecurring, setCategoryRecurring] = useState(true);
  const [categoryThemeId, setCategoryThemeId] = useState<ThemeId>('citrus');
  const [showCategorySubcategories, setShowCategorySubcategories] = useState(false);
  const [showCategoryAdvanced, setShowCategoryAdvanced] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [inlineSubcategoryCategoryId, setInlineSubcategoryCategoryId] = useState<string | null>(null);
  const [inlineSubcategoryText, setInlineSubcategoryText] = useState('');

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');
  const [goalThemeId, setGoalThemeId] = useState<ThemeId>('sun');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [showAllBudgetCategories, setShowAllBudgetCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionTools, setShowTransactionTools] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [activityScope, setActivityScope] = useState<ActivityScope>('month');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSection>('appearance');
  const [showAllBankAccounts, setShowAllBankAccounts] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [transactionSort, setTransactionSort] = useState<TransactionSort>('recent');
  const [insightWindow, setInsightWindow] = useState<InsightWindow>('quarter');
  const [insightSpendMode, setInsightSpendMode] = useState<InsightSpendMode>('all');
  const [aiReviewByMonthId, setAiReviewByMonthId] = useState<Record<string, MonthlyAiReview>>({});
  const [aiReviewBusyMonthId, setAiReviewBusyMonthId] = useState<string | null>(null);
  const [aiReviewErrorByMonthId, setAiReviewErrorByMonthId] = useState<Record<string, string>>({});
  const [expenseAiSuggestion, setExpenseAiSuggestion] = useState<ExpenseAiAssist | null>(null);
  const [expenseAiBusy, setExpenseAiBusy] = useState(false);
  const [expenseAiError, setExpenseAiError] = useState('');
  const [importCleanupReview, setImportCleanupReview] = useState<ImportCleanupReview | null>(null);
  const [importCleanupBusy, setImportCleanupBusy] = useState(false);
  const [importCleanupError, setImportCleanupError] = useState('');
  const [monthPlannerByMonthId, setMonthPlannerByMonthId] = useState<
    Record<string, MonthPlannerReview>
  >({});
  const [monthPlannerBusyMonthId, setMonthPlannerBusyMonthId] = useState<string | null>(null);
  const [monthPlannerErrorByMonthId, setMonthPlannerErrorByMonthId] = useState<
    Record<string, string>
  >({});
  const [planSetupStep, setPlanSetupStep] = useState<BudgetSetupStep>('limit');
  const [showPlanCategoryList, setShowPlanCategoryList] = useState(false);
  const [showAllPlanCategories, setShowAllPlanCategories] = useState(false);

  const latestStateRef = useRef(appState);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const pendingGuestResetRef = useRef(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 430;
  const isNarrow = width < 375;
  const contentHorizontalPadding = isCompact ? 14 : 18;
  const cardHorizontalPadding = 14;
  const swipeRailWidth = 108;
  const swipeViewportWidth = Math.max(
    220,
    width - contentHorizontalPadding * 2 - cardHorizontalPadding * 2,
  );

  const currentTheme = appThemes[appState.preferences.appThemeId];
  const currentCurrencyCode = appState.preferences.currencyCode;
  const currentLanguageCode = appState.preferences.languageCode;
  const localeTag = getLocaleTag(currentLanguageCode);
  const currentCurrencyOption =
    currencyOptions.find((option) => option.code === currentCurrencyCode) ?? null;
  const currentLanguageOption =
    languageOptions.find((option) => option.code === currentLanguageCode) ?? null;
  const normalizedCurrencySearchQuery = currencySearchQuery.trim().toLowerCase();
  const normalizedLanguageSearchQuery = languageSearchQuery.trim().toLowerCase();
  const featuredCurrencyOptions = useMemo(
    () => resolveOptionsByCodes(currencyOptions, featuredCurrencyCodes),
    [],
  );
  const recentCurrencyOptions = useMemo(
    () =>
      resolveOptionsByCodes(currencyOptions, appState.preferences.recentCurrencyCodes).filter(
        (option) => !featuredCurrencyCodes.includes(option.code),
      ),
    [appState.preferences.recentCurrencyCodes],
  );
  const visibleCurrencyOptions = useMemo(() => {
    const source = normalizedCurrencySearchQuery
      ? sortOptionsByLabel(
          currencyOptions.filter((option) =>
            matchesSelectorQuery(
              normalizedCurrencySearchQuery,
              option.code,
              option.label,
              option.description,
            ),
          ),
        )
      : sortOptionsByLabel(currencyOptions);

    if (normalizedCurrencySearchQuery) {
      return source;
    }

    const prioritizedCodes = new Set([
      ...featuredCurrencyOptions.map((option) => option.code),
      ...recentCurrencyOptions.map((option) => option.code),
    ]);

    return source.filter((option) => !prioritizedCodes.has(option.code));
  }, [
    featuredCurrencyOptions,
    normalizedCurrencySearchQuery,
    recentCurrencyOptions,
  ]);
  const featuredLanguageOptions = useMemo(
    () => resolveOptionsByCodes(languageOptions, featuredLanguageCodes),
    [],
  );
  const recentLanguageOptions = useMemo(
    () =>
      resolveOptionsByCodes(languageOptions, appState.preferences.recentLanguageCodes).filter(
        (option) => !featuredLanguageCodes.includes(option.code),
      ),
    [appState.preferences.recentLanguageCodes],
  );
  const visibleLanguageOptions = useMemo(() => {
    const source = normalizedLanguageSearchQuery
      ? sortOptionsByLabel(
          languageOptions.filter((option) =>
            matchesSelectorQuery(
              normalizedLanguageSearchQuery,
              option.code,
              option.label,
              getLocaleTag(option.code),
            ),
          ),
        )
      : sortOptionsByLabel(languageOptions);

    if (normalizedLanguageSearchQuery) {
      return source;
    }

    const prioritizedCodes = new Set([
      ...featuredLanguageOptions.map((option) => option.code),
      ...recentLanguageOptions.map((option) => option.code),
    ]);

    return source.filter((option) => !prioritizedCodes.has(option.code));
  }, [
    featuredLanguageOptions,
    normalizedLanguageSearchQuery,
    recentLanguageOptions,
  ]);
  const currentCurrencyMarker = useMemo(() => {
    try {
      const parts = new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: currentCurrencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(0);

      return (
        parts.find((part) => part.type === 'currency')?.value ??
        currentCurrencyOption?.description ??
        currentCurrencyCode
      );
    } catch {
      return currentCurrencyOption?.description ?? currentCurrencyCode;
    }
  }, [currentCurrencyCode, currentCurrencyOption, localeTag]);
  const formatPreferenceCurrency = (value: number) => currency(value, currentCurrencyCode, localeTag);
  const localeDatePreview = new Intl.DateTimeFormat(localeTag, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const localeCurrencyPreview = formatPreferenceCurrency(2450.75);
  const styles = useMemo(
    () => createStyles(currentTheme, { isCompact, isNarrow }),
    [currentTheme, isCompact, isNarrow],
  );

  useEffect(() => {
    latestStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    const unsubscribe = subscribeToBudgetAuth((nextUser) => {
      setAuthUser(nextUser);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const sortedMonths = useMemo(
    () => [...appState.months].sort((left, right) => compareMonthIds(right.id, left.id)),
    [appState.months],
  );

  const activeMonth =
    sortedMonths.find((month) => month.id === appState.activeMonthId) ?? sortedMonths[0];
  const activeMonthCurrencyCode = activeMonth?.currencyCode ?? currentCurrencyCode;
  const formatCurrency = (value: number, currencyCode: CurrencyCode = activeMonthCurrencyCode) =>
    currency(value, currencyCode, localeTag);
  const formatMonthCurrency = (month: { currencyCode: CurrencyCode }, value: number) =>
    currency(value, month.currencyCode, localeTag);
  const activeMonthCurrencyMarker = (() => {
    try {
      const parts = new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: activeMonthCurrencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(0);

      return parts.find((part) => part.type === 'currency')?.value ?? activeMonthCurrencyCode;
    } catch {
      return activeMonthCurrencyCode;
    }
  })();
  const formatCompactCurrency = (
    value: number,
    currencyCode: CurrencyCode = activeMonthCurrencyCode,
  ) => {
    try {
      return new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: currencyCode,
        notation: 'compact',
        maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0,
      }).format(value);
    } catch {
      return formatCurrency(value, currencyCode);
    }
  };
  const localeMonthPreview = getMonthLabel(activeMonth.id, localeTag);
  const hasActiveBudget = activeMonth ? activeMonth.categories.length > 0 : false;
  const activeMonthIsCurrent = activeMonth ? activeMonth.id === getMonthId(new Date()) : true;

  useEffect(() => {
    if (!activeMonthIsCurrent && activityScope !== 'month') {
      setActivityScope('month');
    }
  }, [activeMonthIsCurrent, activityScope]);

  useEffect(() => {
    if (
      selectedCategoryDetailId &&
      !activeMonth.categories.some((category) => category.id === selectedCategoryDetailId)
    ) {
      setSelectedCategoryDetailId(null);
    }
  }, [activeMonth.categories, selectedCategoryDetailId]);

  const bankAccounts = appState.accounts;
  const accountMap = useMemo(
    () => new Map(bankAccounts.map((account) => [account.id, account])),
    [bankAccounts],
  );
  const accountUsageCounts = useMemo(() => {
    const counts = new Map<string, number>();

    appState.months.forEach((month) => {
      month.transactions.forEach((transaction) => {
        if (!transaction.accountId) {
          return;
        }

        counts.set(transaction.accountId, (counts.get(transaction.accountId) ?? 0) + 1);
      });
    });

    return counts;
  }, [appState.months]);
  const visibleBankAccounts = useMemo(
    () => (showAllBankAccounts ? bankAccounts : bankAccounts.slice(0, 3)),
    [bankAccounts, showAllBankAccounts],
  );
  const essentialQuickPresets = useMemo(
    () => quickPresets.filter((preset) => preset.bucket === 'needs').slice(0, 4),
    [],
  );

  const categorySummaries = useMemo(
    () => (activeMonth ? getCategorySummaries(activeMonth) : []),
    [activeMonth],
  );
  const weeklyInsightRows = useMemo(
    () => (activeMonth ? buildWeeklyInsightRows(activeMonth, new Date()) : []),
    [activeMonth],
  );
  const weeklyInsightMax = useMemo(
    () =>
      Math.max(
        ...weeklyInsightRows
          .filter((row) => row.state !== 'upcoming')
          .map((row) => row.total),
        1,
      ),
    [weeklyInsightRows],
  );
  const totalPlanned = activeMonth ? getTotalPlanned(activeMonth) : 0;
  const totalSpent = activeMonth ? getTotalSpent(activeMonth) : 0;
  const monthlyLimitNumber = activeMonth ? Number(activeMonth.monthlyLimit) || 0 : 0;
  const remaining = monthlyLimitNumber - totalSpent;
  const forecastSnapshot = useMemo(
    () => buildForecastSnapshot(activeMonth, categorySummaries, monthlyLimitNumber, totalPlanned, new Date()),
    [activeMonth, categorySummaries, monthlyLimitNumber, totalPlanned],
  );
  const projectedSpend = forecastSnapshot.projectedSpend;
  const onTrackCount = categorySummaries.filter((summary) => summary.spent <= summary.category.planned)
    .length;
  const overCount = categorySummaries.length - onTrackCount;
  const activeMonthName = activeMonth ? getMonthName(activeMonth.id, localeTag) : 'This month';
  const isCurrentMonth = activeMonth ? activeMonth.id === getMonthId(new Date()) : true;
  const monthlyProgress = monthlyLimitNumber > 0 ? totalSpent / monthlyLimitNumber : 0;
  const allocationProgress = monthlyLimitNumber > 0 ? totalPlanned / monthlyLimitNumber : 0;
  const allocationDifference = monthlyLimitNumber - totalPlanned;
  const allocationStatusLabel =
    monthlyLimitNumber <= 0
      ? 'Need limit'
      : allocationDifference >= 0
        ? 'Left to assign'
        : 'Over assigned';
  const allocationStatusValue =
    monthlyLimitNumber <= 0
      ? 'Set limit'
      : formatCurrency(Math.abs(allocationDifference));
  const allocationStatusTone =
    monthlyLimitNumber <= 0
      ? 'neutral'
      : allocationDifference >= 0
        ? 'good'
        : 'alert';
  const editingCategoryPlanned =
    activeMonth.categories.find((category) => category.id === editingCategoryId)?.planned ?? 0;
  const categoryDraftPlanned = Number(categoryPlanned);
  const categoryDraftIsValid = !Number.isNaN(categoryDraftPlanned) && categoryDraftPlanned > 0;
  const projectedAssignedTotal =
    totalPlanned - editingCategoryPlanned + (categoryDraftIsValid ? categoryDraftPlanned : 0);
  const projectedAllocationDelta =
    monthlyLimitNumber > 0 ? monthlyLimitNumber - projectedAssignedTotal : null;
  const previousBudgetMonth =
    sortedMonths.find((month) => month.id !== activeMonth.id && month.categories.length > 0) ?? null;
  const previousCategorySummaryByName = useMemo(() => {
    if (!previousBudgetMonth) {
      return new Map<string, CategorySummary>();
    }

    return new Map(
      getCategorySummaries(previousBudgetMonth).map((summary) => [
        summary.category.name.trim().toLowerCase(),
        summary,
      ]),
    );
  }, [previousBudgetMonth]);
  const normalizedCategoryName = categoryName.trim().toLowerCase();
  const historicalCategoryMatches = useMemo(
    () =>
      normalizedCategoryName
        ? sortedMonths
            .filter((month) => month.id !== activeMonth.id)
            .flatMap((month) =>
              month.categories
                .filter((category) => category.name.trim().toLowerCase() === normalizedCategoryName)
                .map((category) => ({ monthId: month.id, category })),
            )
        : [],
    [activeMonth.id, normalizedCategoryName, sortedMonths],
  );
  const latestHistoricalCategoryMatch = historicalCategoryMatches[0] ?? null;
  const averageHistoricalPlan =
    historicalCategoryMatches.length > 0
      ? historicalCategoryMatches.reduce((sum, entry) => sum + entry.category.planned, 0) /
        historicalCategoryMatches.length
      : null;
  const categoryPlanSuggestions = useMemo(() => {
    const suggestions: Array<{
      id: string;
      label: string;
      amount: number;
      meta: string;
    }> = [];

    if (latestHistoricalCategoryMatch) {
      suggestions.push({
        id: `recent-${latestHistoricalCategoryMatch.monthId}`,
        label: getMonthLabel(latestHistoricalCategoryMatch.monthId, localeTag),
        amount: latestHistoricalCategoryMatch.category.planned,
        meta: 'Last used',
      });
    }

    if (
      averageHistoricalPlan !== null &&
      (!latestHistoricalCategoryMatch ||
        Math.abs(latestHistoricalCategoryMatch.category.planned - averageHistoricalPlan) >= 1)
    ) {
      suggestions.push({
        id: 'average',
        label: `Avg ${historicalCategoryMatches.length} mo`,
        amount: averageHistoricalPlan,
        meta: 'Typical plan',
      });
    }

    return suggestions;
  }, [averageHistoricalPlan, historicalCategoryMatches.length, latestHistoricalCategoryMatch, localeTag]);
  const suggestedPlanSetupStep = getSuggestedBudgetSetupStep(
    monthlyLimitNumber,
    activeMonth.categories.length,
    allocationDifference,
  );
  const suggestedCategoryBucket = inferCategoryBucket(categoryName || categoryBucketMeta[categoryBucket].label);
  const currentCategoryBucketMeta = categoryBucketMeta[categoryBucket];
  const isInitialBudgetSetup = planSetupStep === 'limit' && activeMonth.categories.length === 0;
  const isCategoryBucketAuto = categoryBucketMode === 'auto';
  const categoryCreationTitle =
    activeMonth.categories.length === 0 && !editingCategoryId ? 'Add the first category' : 'Build the categories';
  const categoryCreationSubtitle =
    activeMonth.categories.length === 0 && !editingCategoryId
      ? 'Start with one broad category like rent, groceries, transport, or bills.'
      : 'Keep it light: name, amount, then add detail only when a category needs it.';
  const categoryQuickStatus =
    monthlyLimitNumber > 0 && categoryDraftIsValid && projectedAllocationDelta !== null
      ? projectedAllocationDelta >= 0
        ? `After save: ${formatCurrency(projectedAllocationDelta)} left`
        : `After save: ${formatCurrency(Math.abs(projectedAllocationDelta))} over`
      : '';
  const categoryBucketHint = isCategoryBucketAuto
    ? categoryName.trim()
      ? `Auto picked ${categoryBucketMeta[categoryBucket].label.toLowerCase()} from the category name. Change it only if it looks wrong.`
      : 'Auto is recommended. The app will decide needs or wants from the category name. Use savings manually when you want to ring-fence money.'
    : `Using ${currentCategoryBucketMeta.label.toLowerCase()} manually. Switch back to Auto if you want the app to decide.`;
  const bucketSummaries = categoryBucketOrder.map((bucket) => {
    const categories = activeMonth.categories.filter((category) => category.bucket === bucket);
    const planned = categories.reduce((sum, category) => sum + category.planned, 0);
    const target = monthlyLimitNumber > 0 ? monthlyLimitNumber * budgetBucketTargetRatio[bucket] : 0;
    const difference = planned - target;

    return {
      bucket,
      categories,
      count: categories.length,
      planned,
      target,
      difference,
      targetRatio: budgetBucketTargetRatio[bucket],
    };
  });
  const savingsBucketSummary = bucketSummaries.find((summary) => summary.bucket === 'savings');
  const recurringPlanned = activeMonth.categories
    .filter((category) => category.recurring)
    .reduce((sum, category) => sum + category.planned, 0);
  const recurringSpent = activeMonth.transactions
    .filter((transaction) => transaction.recurring)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const flexibleSpent = activeMonth.transactions
    .filter((transaction) => !transaction.recurring)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const topPlannedCategory =
    [...activeMonth.categories].sort((left, right) => right.planned - left.planned)[0] ?? null;
  const setupReviewItems = [
    monthlyLimitNumber <= 0
      ? {
          tone: 'warning' as const,
          title: 'Set a monthly limit',
          body: 'The app needs a total target before it can show what is left to assign.',
        }
      : allocationDifference > 0
        ? {
            tone: 'warning' as const,
            title: `${formatCurrency(allocationDifference)} still unassigned`,
            body: 'Keep adding categories or increase existing ones until the month feels complete.',
          }
        : allocationDifference < 0
          ? {
              tone: 'alert' as const,
              title: `${formatCurrency(Math.abs(allocationDifference))} over the limit`,
              body: 'Trim one or two categories before you start spending against this plan.',
            }
          : {
              tone: 'good' as const,
              title: 'Every dollar is assigned',
              body: 'The monthly limit and planned categories are balanced.',
            },
    activeMonth.categories.length === 0
      ? {
          tone: 'warning' as const,
          title: 'Add the first category',
          body: 'Start with essentials like rent, groceries, bills, and transport.',
        }
      : topPlannedCategory && topPlannedCategory.planned / Math.max(totalPlanned, 1) > 0.45
        ? {
            tone: 'warning' as const,
            title: `${topPlannedCategory.name} is carrying a lot of the month`,
            body: 'That is fine if it is housing, but it is worth checking whether one lane is too broad.',
          }
        : {
            tone: 'good' as const,
            title: 'Category spread looks healthy',
            body: 'The plan is split across multiple lanes rather than one oversized bucket.',
          },
    !savingsBucketSummary || savingsBucketSummary.planned <= 0
      ? {
          tone: 'warning' as const,
          title: 'No savings lane yet',
          body: 'Add a savings or debt-payoff category so the budget is not only about expenses.',
        }
      : {
          tone: 'good' as const,
          title: `${formatCurrency(savingsBucketSummary.planned)} set aside for savings`,
          body: 'You already have a buffer for future goals or unexpected costs.',
        },
  ];
  const isBudgetSetupReady = monthlyLimitNumber > 0 && activeMonth.categories.length > 0;
  const isBudgetSetupComplete = isBudgetSetupReady && Math.abs(allocationDifference) < 0.01;
  const budgetSetupSummary = isBudgetSetupReady
    ? `Planned ${formatCurrency(totalPlanned)} across ${activeMonth.categories.length} categories in ${activeMonthName}.`
    : 'Add a monthly limit and at least one category to finish the setup.';
  const completedSetupHighlights = [
    `Assigned ${formatCurrency(totalPlanned)}`,
    `${activeMonth.categories.length} categories`,
    savingsBucketSummary?.planned
      ? `Savings ${formatCurrency(savingsBucketSummary.planned)}`
      : 'No savings lane yet',
  ];
  const aiReviewHistoryMonths = useMemo(
    () =>
      sortedMonths
        .filter((month) => compareMonthIds(month.id, activeMonth.id) < 0)
        .slice(0, 3)
        .map((month) => {
          const monthFixedSpent = month.transactions
            .filter((transaction) => transaction.recurring)
            .reduce((sum, transaction) => sum + transaction.amount, 0);
          const monthFlexibleSpent = month.transactions
            .filter((transaction) => !transaction.recurring)
            .reduce((sum, transaction) => sum + transaction.amount, 0);
          const monthSpent = monthFixedSpent + monthFlexibleSpent;
          const monthPlanned = getTotalPlanned(month);

          return {
            currencyCode: month.currencyCode,
            fixedShareRatio: monthSpent > 0 ? monthFixedSpent / monthSpent : 0,
            label: getMonthLabel(month.id, localeTag),
            planned: monthPlanned,
            spent: monthSpent,
            utilizationRatio: monthPlanned > 0 ? monthSpent / monthPlanned : 0,
          };
        }),
    [activeMonth.id, localeTag, sortedMonths],
  );
  const aiReviewAdjustableCategories = useMemo(
    () =>
      [...categorySummaries]
        .filter((summary) => !summary.category.recurring && summary.category.bucket !== 'savings')
        .sort(
          (left, right) =>
            right.spent - left.spent || right.category.planned - left.category.planned,
        )
        .slice(0, 5)
        .map((summary) => ({
          bucket: summary.category.bucket,
          left: summary.left,
          name: summary.category.name,
          planned: summary.category.planned,
          spent: summary.spent,
          tone: summary.tone,
        })),
    [categorySummaries],
  );
  const aiReviewPayload = useMemo(
    () => ({
      adjustableCategories: aiReviewAdjustableCategories,
      adjustableCategoryCount: activeMonth.categories.filter(
        (category) => !category.recurring && category.bucket !== 'savings',
      ).length,
      adjustableSpent: categorySummaries
        .filter((summary) => !summary.category.recurring && summary.category.bucket !== 'savings')
        .reduce(
          (sum, summary) => sum + summary.spent,
          0,
        ),
      categoryCount: activeMonth.categories.length,
      currencyCode: activeMonth.currencyCode,
      flexibleSpent,
      fixedCategoryCount: activeMonth.categories.filter((category) => category.recurring).length,
      fixedShareRatio: totalSpent > 0 ? recurringSpent / totalSpent : 0,
      flexibleCategoryCount: activeMonth.categories.filter((category) => !category.recurring).length,
      historyMonths: aiReviewHistoryMonths,
      historyMixedCurrency: new Set(aiReviewHistoryMonths.map((month) => month.currencyCode)).size > 1,
      localeTag,
      monthId: activeMonth.id,
      monthLabel: getMonthLabel(activeMonth.id, localeTag),
      monthlyLimit: monthlyLimitNumber,
      overBudgetCategoryCount: categorySummaries.filter((summary) => summary.left < 0).length,
      planUsageRatio:
        (monthlyLimitNumber > 0 ? monthlyLimitNumber : totalPlanned) > 0
          ? totalSpent / (monthlyLimitNumber > 0 ? monthlyLimitNumber : totalPlanned)
          : 0,
      recurringPlanned,
      recurringSpent,
      remaining: (monthlyLimitNumber > 0 ? monthlyLimitNumber : totalPlanned) - totalSpent,
      reviewCategories: [...categorySummaries]
        .sort(
          (left, right) =>
            right.spent - left.spent || right.category.planned - left.category.planned,
        )
        .slice(0, 8)
        .map((summary) => ({
          bucket: summary.category.bucket,
          left: summary.left,
          name: summary.category.name,
          planned: summary.category.planned,
          recurring: summary.category.recurring,
          spent: summary.spent,
          tone: summary.tone,
        })),
      savingsPlanned: savingsBucketSummary?.planned ?? 0,
      totalPlanned,
      totalSpent,
    }),
    [
      aiReviewAdjustableCategories,
      activeMonth.categories.length,
      activeMonth.currencyCode,
      activeMonth.id,
      aiReviewHistoryMonths,
      categorySummaries,
      flexibleSpent,
      localeTag,
      monthlyLimitNumber,
      recurringPlanned,
      recurringSpent,
      savingsBucketSummary?.planned,
      totalSpent,
      totalPlanned,
    ],
  );
  const expenseAiAssistPayload = useMemo(() => {
    const categoryById = new Map(activeMonth.categories.map((category) => [category.id, category]));

    return {
      accounts: bankAccounts.map((account) => ({
        customKinds: account.customKinds,
        id: account.id,
        kinds: account.kinds,
        name: account.name,
      })),
      amount: Number(expenseAmount) || 0,
      categories: activeMonth.categories.map((category) => ({
        bucket: category.bucket,
        id: category.id,
        name: category.name,
        recurring: category.recurring,
        subcategories: category.subcategories,
      })),
      currencyCode: activeMonth.currencyCode,
      localeTag,
      monthId: activeMonth.id,
      monthLabel: getMonthLabel(activeMonth.id, localeTag),
      note: expenseNote.trim(),
      recentTransactions: [...activeMonth.transactions]
        .sort(
          (left, right) =>
            new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime(),
        )
        .slice(0, 12)
        .map((transaction) => ({
          accountName: transaction.accountId ? accountMap.get(transaction.accountId)?.name ?? '' : '',
          amount: transaction.amount,
          categoryName: categoryById.get(transaction.categoryId)?.name ?? '',
          note: transaction.note,
          recurring: transaction.recurring,
        })),
    };
  }, [
    activeMonth.categories,
    activeMonth.currencyCode,
    activeMonth.id,
    activeMonth.transactions,
    accountMap,
    bankAccounts,
    expenseAmount,
    expenseNote,
    localeTag,
  ]);
  const aiPlannerHistoryCategories = useMemo(() => {
    const aggregates = new Map<
      string,
      {
        averagePlannedTotal: number;
        bucket: CategoryBucket;
        lastMonthId: string;
        lastPlanned: number;
        monthsSeen: number;
        name: string;
        recurringCount: number;
        subcategories: Set<string>;
      }
    >();

    sortedMonths
      .filter((month) => compareMonthIds(month.id, activeMonth.id) < 0)
      .slice(0, 6)
      .forEach((month) => {
        month.categories.forEach((category) => {
          const key = category.name.trim().toLowerCase();

          if (!key) {
            return;
          }

          const existing = aggregates.get(key);

          if (existing) {
            existing.averagePlannedTotal += category.planned;
            existing.monthsSeen += 1;
            existing.recurringCount += Number(category.recurring);
            category.subcategories.forEach((subCategory) => existing.subcategories.add(subCategory));

            if (compareMonthIds(month.id, existing.lastMonthId) > 0) {
              existing.lastMonthId = month.id;
              existing.lastPlanned = category.planned;
              existing.bucket = category.bucket;
            }

            return;
          }

          aggregates.set(key, {
            averagePlannedTotal: category.planned,
            bucket: category.bucket,
            lastMonthId: month.id,
            lastPlanned: category.planned,
            monthsSeen: 1,
            name: category.name,
            recurringCount: Number(category.recurring),
            subcategories: new Set(category.subcategories),
          });
        });
      });

    return [...aggregates.values()]
      .map((entry) => ({
        averagePlanned: entry.averagePlannedTotal / Math.max(entry.monthsSeen, 1),
        bucket: entry.bucket,
        lastPlanned: entry.lastPlanned,
        monthsSeen: entry.monthsSeen,
        name: entry.name,
        recurring: entry.recurringCount >= Math.max(1, Math.ceil(entry.monthsSeen / 2)),
        subcategories: [...entry.subcategories].slice(0, 6),
      }))
      .sort(
        (left, right) =>
          right.monthsSeen - left.monthsSeen ||
          Number(right.recurring) - Number(left.recurring) ||
          right.lastPlanned - left.lastPlanned,
      )
      .slice(0, 12);
  }, [activeMonth.id, sortedMonths]);
  const aiMonthPlannerPayload = useMemo(
    () => ({
      currencyCode: activeMonth.currencyCode,
      currentCategories: activeMonth.categories.map((category) => ({
        bucket: category.bucket,
        name: category.name,
        planned: category.planned,
        recurring: category.recurring,
        subcategories: category.subcategories,
      })),
      currentCategoryCount: activeMonth.categories.length,
      historyCategories: aiPlannerHistoryCategories,
      localeTag,
      monthId: activeMonth.id,
      monthLabel: getMonthLabel(activeMonth.id, localeTag),
      monthlyLimit: monthlyLimitNumber,
    }),
    [
      activeMonth.categories,
      activeMonth.currencyCode,
      activeMonth.id,
      aiPlannerHistoryCategories,
      localeTag,
      monthlyLimitNumber,
    ],
  );
  const aiImportCleanupPayload = useMemo(() => {
    const categoryAggregates = new Map<
      string,
      {
        averagePlannedTotal: number;
        bucket: CategoryBucket;
        monthsUsed: Set<string>;
        name: string;
        recurringMonths: number;
        subcategories: Set<string>;
      }
    >();

    sortedMonths.forEach((month) => {
      month.categories.forEach((category) => {
        const key = category.name.trim().toLowerCase();

        if (!key) {
          return;
        }

        const existing = categoryAggregates.get(key);

        if (existing) {
          existing.averagePlannedTotal += category.planned;
          existing.monthsUsed.add(month.id);
          existing.recurringMonths += Number(category.recurring);
          category.subcategories.forEach((subCategory) => existing.subcategories.add(subCategory));
          return;
        }

        categoryAggregates.set(key, {
          averagePlannedTotal: category.planned,
          bucket: category.bucket,
          monthsUsed: new Set([month.id]),
          name: category.name,
          recurringMonths: Number(category.recurring),
          subcategories: new Set(category.subcategories),
        });
      });
    });

    return {
      accounts: bankAccounts.map((account) => ({
        customKinds: account.customKinds,
        kinds: account.kinds,
        name: account.name,
        usageCount: accountUsageCounts.get(account.id) ?? 0,
      })),
      activeMonthId: activeMonth.id,
      activeMonthLabel: getMonthLabel(activeMonth.id, localeTag),
      categories: [...categoryAggregates.values()]
        .map((entry) => ({
          averagePlanned: entry.averagePlannedTotal / Math.max(entry.monthsUsed.size, 1),
          bucket: entry.bucket,
          monthsUsed: entry.monthsUsed.size,
          name: entry.name,
          recurringMonths: entry.recurringMonths,
          subcategories: [...entry.subcategories].slice(0, 6),
        }))
        .sort((left, right) => right.monthsUsed - left.monthsUsed || right.averagePlanned - left.averagePlanned)
        .slice(0, 16),
      currencyCode: activeMonth.currencyCode,
      historyMixedCurrency: new Set(sortedMonths.map((month) => month.currencyCode)).size > 1,
      localeTag,
      months: sortedMonths.slice(0, 6).map((month) => {
        const monthSpent = getTotalSpent(month);
        const monthRecurringSpent = month.transactions
          .filter((transaction) => transaction.recurring)
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const monthPlanned = getTotalPlanned(month);

        return {
          categoryCount: month.categories.length,
          currencyCode: month.currencyCode,
          label: getMonthLabel(month.id, localeTag),
          planUsageRatio: monthPlanned > 0 ? monthSpent / monthPlanned : 0,
          recurringShareRatio: monthSpent > 0 ? monthRecurringSpent / monthSpent : 0,
          transactionCount: month.transactions.length,
        };
      }),
    };
  }, [
    accountUsageCounts,
    activeMonth.currencyCode,
    activeMonth.id,
    bankAccounts,
    localeTag,
    sortedMonths,
  ]);
  const insightMonths = useMemo(() => {
    const windowSize = insightWindowMeta[insightWindow].months;
    const monthsUpToActive = sortedMonths.filter((month) => compareMonthIds(month.id, activeMonth.id) <= 0);

    return monthsUpToActive.slice(0, windowSize);
  }, [activeMonth.id, insightWindow, sortedMonths]);
  const previousInsightMonths = useMemo(() => {
    const windowSize = insightWindowMeta[insightWindow].months;
    const monthsUpToActive = sortedMonths.filter((month) => compareMonthIds(month.id, activeMonth.id) <= 0);

    return monthsUpToActive.slice(windowSize, windowSize * 2);
  }, [activeMonth.id, insightWindow, sortedMonths]);
  const insightSummary = useMemo(
    () => buildInsightSummary(insightMonths, previousInsightMonths, localeTag),
    [insightMonths, localeTag, previousInsightMonths],
  );
  const insightSuggestions = useMemo(
    () => buildInsightSuggestions(insightSummary, insightWindow),
    [insightSummary, insightWindow],
  );
  const insightDisplayedMonths = useMemo(
    () =>
      insightSummary.months.map((month) => ({
        ...month,
        displaySpent: insightSpendMode === 'adjustable' ? month.flexibleSpent : month.spent,
      })),
    [insightSpendMode, insightSummary.months],
  );
  const insightDisplayedTotal =
    insightSpendMode === 'adjustable' ? insightSummary.totalFlexibleSpent : insightSummary.totalSpent;
  const insightDisplayedAverageMonthly =
    insightSummary.months.length > 0 ? insightDisplayedTotal / insightSummary.months.length : 0;
  const insightWindowTargetMonths = insightWindowMeta[insightWindow].months;
  const insightWindowCoverageText = `${insightSummary.months.length}/${insightWindowTargetMonths} months recorded`;
  const insightCurrencySummaryLabel =
    insightSummary.currencyCodes.length <= 2
      ? insightSummary.currencyCodes.join(' + ')
      : `${insightSummary.currencyCodes.length} currencies`;
  const weeklyInsightSubtitle = isCurrentMonth
    ? 'All four weeks now sit in one compact row. Each column shows the actual weekly total, split into fixed recurring and flexible spend.'
    : 'This closed month view keeps all four weeks in one compact row while still separating fixed recurring and flexible spend.';
  const insightRangeLead = insightSummary.topAdjustableCategory
    ? `${insightSummary.topAdjustableCategory.name} is the biggest adjustable category in this window.`
    : insightSummary.isMixedCurrency
      ? `${insightCurrencySummaryLabel} appear in this window, so the view compares plan usage instead of merging currencies.`
    : insightSummary.recurringShare >= 0.55
      ? `${Math.round(insightSummary.recurringShare * 100)}% of this window is fixed recurring cost.`
      : 'Import or track more months to unlock a clearer long-range pattern.';
  const longRangeSubtitle =
    insightSummary.months.length < insightWindowTargetMonths
      ? `This ${insightWindowMeta[insightWindow].label.toLowerCase()} view is based on ${insightWindowCoverageText}, so treat it as an early directional read.`
      : insightSummary.isMixedCurrency
        ? `This window mixes ${insightCurrencySummaryLabel}. The charts use each month's own currency for labels and compare plan usage ratios instead of fake combined totals.`
      : insightSpendMode === 'adjustable'
        ? 'Adjustable view hides fixed recurring baseline so you can judge what is actually moveable.'
        : 'Review fixed vs flexible patterns across the full window.';
  const insightRangeSubtitle =
    insightSummary.isMixedCurrency
      ? insightSpendMode === 'adjustable'
        ? 'Adjustable view compares flexible-spend share within each month because currencies differ across the window.'
        : 'Each bar shows how much of that month plan was used, with fixed and flexible spend split inside the fill.'
      : insightSpendMode === 'adjustable'
        ? insightSummary.topAdjustableCategory
          ? `${insightSummary.topAdjustableCategory.name} is the biggest adjustable category in this window.`
          : 'Showing adjustable spend only. Fixed recurring costs are excluded from these bars.'
        : insightRangeLead;
  const activeAiReview = aiReviewByMonthId[activeMonth.id] ?? null;
  const activeAiReviewError = aiReviewErrorByMonthId[activeMonth.id] ?? '';
  const aiReviewBusy = aiReviewBusyMonthId === activeMonth.id;
  const aiReviewGeneratedLabel = activeAiReview
    ? new Intl.DateTimeFormat(localeTag, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(activeAiReview.generatedAt))
    : '';
  const activeMonthPlanner = monthPlannerByMonthId[activeMonth.id] ?? null;
  const activeMonthPlannerError = monthPlannerErrorByMonthId[activeMonth.id] ?? '';
  const monthPlannerBusy = monthPlannerBusyMonthId === activeMonth.id;
  const expenseAiSuggestedCategory =
    expenseAiSuggestion?.categoryId
      ? activeMonth.categories.find((category) => category.id === expenseAiSuggestion.categoryId) ?? null
      : null;
  const expenseAiSuggestedAccount =
    expenseAiSuggestion?.accountId ? accountMap.get(expenseAiSuggestion.accountId) ?? null : null;

  const categoryToneById = useMemo(
    () =>
      new Map(
        categorySummaries.map((summary) => [
          summary.category.id,
          { tone: summary.tone, name: summary.category.name },
        ]),
      ),
    [categorySummaries],
  );
  const priorityBudgetCategorySummaries = useMemo(
    () =>
      [...categorySummaries]
        .filter((summary) => summary.tone !== 'good' || summary.thisWeek > 0)
        .sort((left, right) => {
          const toneWeight = (tone: AlertTone) =>
            tone === 'alert' ? 2 : tone === 'warning' ? 1 : 0;
          const toneGap = toneWeight(right.tone) - toneWeight(left.tone);

          if (toneGap !== 0) {
            return toneGap;
          }

          if (right.thisWeek !== left.thisWeek) {
            return right.thisWeek - left.thisWeek;
          }

          return right.spent - left.spent;
        }),
    [categorySummaries],
  );
  const healthyBudgetCategorySummaries = useMemo(
    () =>
      [...categorySummaries]
        .filter((summary) => summary.tone === 'good' && summary.thisWeek <= 0)
        .sort((left, right) => right.category.planned - left.category.planned),
    [categorySummaries],
  );
  const visibleBudgetCategorySummaries = useMemo(
    () =>
      showAllBudgetCategories
        ? [...priorityBudgetCategorySummaries, ...healthyBudgetCategorySummaries]
        : priorityBudgetCategorySummaries.length > 0
          ? priorityBudgetCategorySummaries
          : healthyBudgetCategorySummaries.slice(0, 3),
    [
      healthyBudgetCategorySummaries,
      priorityBudgetCategorySummaries,
      showAllBudgetCategories,
    ],
  );
  const hiddenHealthyBudgetCategoryCount = showAllBudgetCategories
    ? 0
    : priorityBudgetCategorySummaries.length > 0
      ? healthyBudgetCategorySummaries.length
      : Math.max(healthyBudgetCategorySummaries.length - visibleBudgetCategorySummaries.length, 0);
  const selectedCategoryDetail = selectedCategoryDetailId
    ? activeMonth.categories.find((category) => category.id === selectedCategoryDetailId) ?? null
    : null;
  const selectedCategorySummary =
    selectedCategoryDetailId
      ? categorySummaries.find((summary) => summary.category.id === selectedCategoryDetailId) ?? null
      : null;
  const selectedCategoryTransactions = useMemo(
    () =>
      selectedCategoryDetailId
        ? sortTransactions(
            activeMonth.transactions.filter(
              (transaction) => transaction.categoryId === selectedCategoryDetailId,
            ),
            'recent',
          ).slice(0, 5)
        : [],
    [activeMonth.transactions, selectedCategoryDetailId],
  );

  const filteredTransactions = useMemo(() => {
    if (!activeMonth) {
      return [];
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortTransactions(
      activeMonth.transactions.filter((transaction) => {
        const category = activeMonth.categories.find(
          (item) => item.id === transaction.categoryId,
        );
        const categoryName = category?.name.toLowerCase() ?? '';
        const note = transaction.note.toLowerCase();
        const tone = categoryToneById.get(transaction.categoryId)?.tone ?? 'good';

        const matchesQuery =
          !normalizedQuery ||
          note.includes(normalizedQuery) ||
          categoryName.includes(normalizedQuery) ||
          formatCurrency(transaction.amount).toLowerCase().includes(normalizedQuery);

        const matchesFilter =
          transactionFilter === 'all' ||
          (transactionFilter === 'over' && tone === 'alert') ||
          (transactionFilter === 'healthy' && tone === 'good');
        const matchesScope =
          activityScope === 'month'
            ? true
            : activeMonthIsCurrent
              ? matchesActivityScope(transaction.happenedAt, activityScope)
              : false;

        return matchesQuery && matchesFilter && matchesScope;
      }),
      transactionSort,
    );
  }, [
    activeMonth,
    activeMonthIsCurrent,
    activityScope,
    categoryToneById,
    searchQuery,
    transactionFilter,
    transactionSort,
  ]);
  const hasTransactionRefinements =
    searchQuery.trim().length > 0 ||
    transactionFilter !== 'all' ||
    transactionSort !== 'recent' ||
    activityScope !== 'month';
  const visibleTransactions = useMemo(
    () =>
      hasTransactionRefinements || showAllTransactions
        ? filteredTransactions
        : filteredTransactions.slice(0, 6),
    [filteredTransactions, hasTransactionRefinements, showAllTransactions],
  );
  const hiddenTransactionCount = Math.max(filteredTransactions.length - visibleTransactions.length, 0);
  const filteredTransactionTotal = useMemo(
    () => filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    [filteredTransactions],
  );
  const visiblePlanCategorySummaries = useMemo(
    () => (showAllPlanCategories ? categorySummaries : categorySummaries.slice(0, 3)),
    [categorySummaries, showAllPlanCategories],
  );

  const alerts = useMemo(
    () =>
      buildForecastAlerts(
        forecastSnapshot,
        categorySummaries.length,
        overCount,
        currentCurrencyCode,
        localeTag,
      ),
    [categorySummaries.length, currentCurrencyCode, forecastSnapshot, localeTag, overCount],
  );
  const primaryAlert = alerts[0] ?? null;
  const forecastChipLabel = !forecastSnapshot.isCurrentMonth
    ? 'Month closed'
    : forecastSnapshot.forecastBase <= 0
      ? 'Add limit'
      : forecastSnapshot.projectedDelta > 0
        ? `${formatCurrency(forecastSnapshot.projectedDelta)} over`
        : `${formatCurrency(Math.max(forecastSnapshot.forecastBase - forecastSnapshot.projectedSpend, 0))} buffer`;
  const paceLineLabel =
    forecastSnapshot.forecastBase <= 0
      ? 'No limit'
      : Math.abs(forecastSnapshot.spendGap) < Math.max(forecastSnapshot.forecastBase * 0.02, 10)
        ? 'On pace'
        : forecastSnapshot.spendGap > 0
          ? `${formatCurrency(forecastSnapshot.spendGap)} ahead`
          : `${formatCurrency(Math.abs(forecastSnapshot.spendGap))} under`;
  const paceLineMeta =
    forecastSnapshot.forecastBase > 0
      ? `vs ${formatCurrency(forecastSnapshot.spendToDateTarget)} flexible target by day ${forecastSnapshot.daysElapsed}`
      : 'Set a monthly limit to track pace against a target.';
  const safeDailyLabel = !forecastSnapshot.isCurrentMonth
    ? 'Closed'
    : forecastSnapshot.forecastBase <= 0
      ? 'Set limit'
      : forecastSnapshot.daysRemaining === 0
        ? 'Final day'
        : forecastSnapshot.safeDailyBudget === null
          ? 'Open'
          : forecastSnapshot.safeDailyBudget === 0
            ? 'No room'
            : formatCurrency(forecastSnapshot.safeDailyBudget);
  const safeDailyMeta = !forecastSnapshot.isCurrentMonth
    ? 'The month has already finished.'
    : forecastSnapshot.daysRemaining > 0
      ? `${forecastSnapshot.daysRemaining} days left in the month`
      : 'Today is the last day of the month.';
  const runwayLabel = !forecastSnapshot.isCurrentMonth
    ? 'Locked'
    : forecastSnapshot.forecastBase <= 0
      ? 'Set limit'
      : forecastSnapshot.averageDailySpend <= 0
        ? 'Open'
        : forecastSnapshot.runwayDays === null
          ? 'At limit'
          : forecastSnapshot.runwayDays >= forecastSnapshot.daysRemaining
            ? 'Month covered'
            : `${Math.max(1, Math.floor(forecastSnapshot.runwayDays))} days`;
  const runwayMeta = !forecastSnapshot.isCurrentMonth
    ? 'No runway calculation after month close.'
    : forecastSnapshot.averageDailySpend > 0
      ? `At ${formatCurrency(forecastSnapshot.averageDailySpend)} per day in flexible spend`
      : 'No flexible spend pace recorded yet.';
  const riskThreshold = forecastSnapshot.dominantCategory
    ? Math.max(forecastSnapshot.dominantCategory.planned * 0.08, 10)
    : 0;
  const riskLabel =
    forecastSnapshot.dominantCategory &&
    forecastSnapshot.dominantCategory.projectedDelta > riskThreshold
      ? forecastSnapshot.dominantCategory.name
      : overCount > 0
        ? `${overCount} hot`
        : 'Balanced';
  const riskMeta =
    forecastSnapshot.dominantCategory &&
    forecastSnapshot.dominantCategory.projectedDelta > riskThreshold
      ? `Forecast +${formatCurrency(forecastSnapshot.dominantCategory.projectedDelta)} above plan`
      : `${onTrackCount}/${categorySummaries.length || 0} categories on track`;

  const saveMessage =
    saveState === 'hydrating'
      ? 'Restoring your budget...'
      : saveState === 'saving'
        ? 'Saving locally...'
        : saveState === 'error'
          ? 'Local save failed.'
          : cloudState === 'connecting'
            ? 'Saved locally. Connecting to Firebase...'
            : cloudState === 'syncing'
              ? 'Saving locally and to Firebase...'
              : cloudState === 'local-only'
                ? 'Saved locally. Cloud sync is unavailable.'
                : 'Saved locally and to Firebase.';
  const screenMeta: Record<ScreenId, { label: string; navIcon: string; title: string; subtitle: string }> = {
    home: {
      label: 'Budget',
      navIcon: 'B',
      title: 'Current budget',
      subtitle: 'Keep the first screen centered on this month, the categories, and what needs attention.',
    },
    spend: {
      label: 'Activity',
      navIcon: 'A',
      title: 'Activity and transactions',
      subtitle: 'Add expenses quickly, then search, sort, and clean up the ledger.',
    },
    plan: {
      label: 'Plan',
      navIcon: 'P',
      title: 'Shape the budget',
      subtitle: 'Manage categories, recurring plans, and savings goals.',
    },
    insights: {
      label: 'Insights',
      navIcon: 'I',
      title: 'Zoom out on the trend',
      subtitle: 'Review quarter, 6-month, and yearly patterns with clearer suggestions.',
    },
    settings: {
      label: 'Settings',
      navIcon: 'S',
      title: 'Account, themes, and data',
      subtitle: 'Choose the app look and move data in and out in safer formats.',
    },
  };
  const screenTabs: ScreenId[] = ['home', 'spend', 'plan', 'insights', 'settings'];
  const accountLabel =
    authUser && !authUser.isAnonymous && authUser.email ? authUser.email : 'Guest mode';
  const authStatusColor =
    authStatus.includes('failed') || authStatus.includes('could not') || authStatus.includes('did not')
      ? currentTheme.alertText
      : currentTheme.accentText;
  const settingsOverview = [
    `${currentTheme.name} theme`,
    currentCurrencyCode,
    currentLanguageOption?.label ?? currentLanguageCode.toUpperCase(),
    `${bankAccounts.length} account${bankAccounts.length === 1 ? '' : 's'}`,
    authUser?.isAnonymous ? 'Guest mode' : 'Signed in',
  ].join(' • ');
  const settingsSections: Array<{ id: SettingsSection; label: string }> = [
    { id: 'appearance', label: 'Look' },
    { id: 'locale', label: 'Locale' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'cloud', label: 'Login' },
    { id: 'data', label: 'Data' },
  ];

  const activateSettingsSection = (section: SettingsSection) => {
    if (section !== 'locale') {
      setIsCurrencyDropdownOpen(false);
      setIsLanguageDropdownOpen(false);
      setCurrencySearchQuery('');
      setLanguageSearchQuery('');
    }

    setActiveSettingsSection(section);
  };

  const openThemePicker = () => {
    setIsThemeSheetOpen(true);
    activateSettingsSection('appearance');
    setActiveScreen('settings');
  };

  const closeThemePicker = () => {
    setIsThemeSheetOpen(false);
  };

  const closeAccountSheet = () => {
    setIsAccountSheetOpen(false);
    resetAccountForm();
  };

  const openAccountSheet = (account?: BankAccount) => {
    if (account) {
      setEditingAccountId(account.id);
      setAccountName(account.name);
      setAccountKinds(account.kinds);
      setAccountCustomKindsText(account.customKinds.join(', '));
    } else {
      resetAccountForm();
    }

    activateSettingsSection('accounts');
    setActiveScreen('settings');
    setIsAccountSheetOpen(true);
  };

  const resetTransactionForm = () => {
    setExpenseAmount('');
    setExpenseNote('');
    setExpenseAccountId(bankAccounts[0]?.id ?? '');
    setExpenseDate(getDefaultExpenseDate(activeMonth?.id ?? getMonthId(new Date())));
    setExpenseRecurring(false);
    setExpenseAiSuggestion(null);
    setExpenseAiError('');
    setExpenseAiBusy(false);
    setShowExpenseDatePicker(false);
    setIsExpenseSheetOpen(false);
    setEditingTransactionId(null);
  };

  const openExpenseCapture = (categoryId?: string, nextScreen: ScreenId | null = 'spend') => {
    if (activeMonth.categories.length === 0) {
      openPlanCategories();
      return;
    }

    resetTransactionForm();

    if (categoryId) {
      const category = activeMonth.categories.find((item) => item.id === categoryId);
      setExpenseCategoryId(categoryId);
      setExpenseRecurring(category?.recurring ?? false);
    }

    setIsExpenseSheetOpen(true);
    if (nextScreen) {
      setActiveScreen(nextScreen);
    }
  };

  const openCategoryDetail = (categoryId: string) => {
    setSelectedCategoryDetailId(categoryId);
  };

  const closeCategoryDetail = () => {
    setSelectedCategoryDetailId(null);
  };

  const resetAccountForm = () => {
    setAccountName('');
    setAccountKinds(['spending']);
    setAccountCustomKindsText('');
    setEditingAccountId(null);
  };

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryPlanned('');
    setCategorySubcategoriesText('');
    setShowCategorySubcategories(false);
    setCategoryBucket('wants');
    setCategoryBucketMode('auto');
    setCategoryRecurring(true);
    setCategoryThemeId('citrus');
    setShowCategoryAdvanced(false);
    setEditingCategoryId(null);
    setInlineSubcategoryCategoryId(null);
    setInlineSubcategoryText('');
  };

  const resetGoalForm = () => {
    setGoalName('');
    setGoalTarget('');
    setGoalSaved('');
    setGoalThemeId('sun');
    setEditingGoalId(null);
  };

  const updateAppTheme = (themeId: AppThemeId) => {
    if (appState.preferences.appThemeId === themeId) {
      setIsThemeSheetOpen(false);
      return;
    }

    updateAppState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        appThemeId: themeId,
      },
    }));
    setIsThemeSheetOpen(false);
  };

  const updateCurrencyCode = (currencyCode: CurrencyCode) => {
    if (appState.preferences.currencyCode === currencyCode) {
      setIsCurrencyDropdownOpen(false);
      setCurrencySearchQuery('');
      return;
    }

    setIsCurrencyDropdownOpen(false);
    setCurrencySearchQuery('');
    updateAppState((current) => ({
      ...current,
      months: current.months.map((month) =>
        month.id === current.activeMonthId &&
        month.categories.length === 0 &&
        month.transactions.length === 0 &&
        (Number(month.monthlyLimit) || 0) <= 0
          ? { ...month, currencyCode }
          : month,
      ),
      preferences: {
        ...current.preferences,
        currencyCode,
        recentCurrencyCodes: pushRecentCode(current.preferences.recentCurrencyCodes, currencyCode),
      },
    }));
  };

  const toggleCurrencyDropdown = () => {
    setIsCurrencyDropdownOpen((current) => {
      if (current) {
        setCurrencySearchQuery('');
      }

      return !current;
    });
  };

  const updateLanguageCode = (languageCode: LanguageCode) => {
    if (appState.preferences.languageCode === languageCode) {
      setIsLanguageDropdownOpen(false);
      setLanguageSearchQuery('');
      return;
    }

    setIsLanguageDropdownOpen(false);
    setLanguageSearchQuery('');
    updateAppState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        languageCode,
        recentLanguageCodes: pushRecentCode(current.preferences.recentLanguageCodes, languageCode),
      },
    }));
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen((current) => {
      if (current) {
        setLanguageSearchQuery('');
      }

      return !current;
    });
  };

  const submitAuthAction = async () => {
    const normalizedEmail = authEmail.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setAuthStatus('Enter a valid email address.');
      return;
    }

    if (authPassword.length < 6) {
      setAuthStatus('Use a password with at least 6 characters.');
      return;
    }

    setAuthBusy(true);
    setAuthStatus('');

    try {
      if (authMode === 'create') {
        const result = await createBudgetPasswordAccount(normalizedEmail, authPassword);
        setAuthStatus(
          result.linkedGuest
            ? 'Account created. This guest budget is now attached to your login.'
            : 'Account created. Your budget will now follow this login.',
        );
      } else {
        await signInBudgetPasswordUser(normalizedEmail, authPassword);
        setAuthStatus('Signed in. Loading your saved budget...');
      }

      setAuthPassword('');
    } catch (error) {
      setAuthStatus(getAuthErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const switchToGuestMode = async () => {
    setAuthBusy(true);
    setAuthStatus('');
    pendingGuestResetRef.current = true;
    bootstrappedUserIdRef.current = null;

    try {
      await signOutBudgetUser();
      setAuthMode('signin');
      setAuthPassword('');
      setAuthStatus('Signed out. Starting a fresh guest session...');
    } catch (error) {
      pendingGuestResetRef.current = false;
      setAuthStatus(getAuthErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const updateAppState = (producer: (current: BudgetAppState) => BudgetAppState) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAppState((current) =>
      ensureCurrentMonth(
        {
          ...producer(current),
          updatedAt: Date.now(),
        },
        new Date(),
      ),
    );
  };

  const updateActiveMonth = (producer: (currentMonth: typeof activeMonth) => typeof activeMonth) => {
    if (!activeMonth) {
      return;
    }

    updateAppState((current) => ({
      ...current,
      months: current.months.map((month) =>
        month.id === activeMonth.id ? { ...producer(month), updatedAt: Date.now() } : month,
      ),
    }));
  };

  useEffect(() => {
    if (!isAuthReady || authUser) {
      return;
    }

    void ensureBudgetCloudUser().catch(() => {
      setCloudState('local-only');
    });
  }, [authUser, isAuthReady]);

  useEffect(() => {
    let isActive = true;

    const hydrateBudgetState = async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
        const legacy = stored ? null : await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        const normalized = normalizeBudgetAppState(
          stored ? JSON.parse(stored) : legacy ? JSON.parse(legacy) : null,
          new Date(),
        );

        if (isActive && normalized) {
          setAppState(normalized);
        }

        if (isActive) {
          setSaveState('saved');
        }
      } catch {
        if (isActive) {
          setSaveState('error');
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    void hydrateBudgetState();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !isAuthReady || !authUser || bootstrappedUserIdRef.current === authUser.uid) {
      return;
    }

    let isActive = true;

    const bootstrapCloud = async () => {
      setCloudState('connecting');

      try {
        const userStorageKey = getUserStorageKey(authUser.uid);
        const [userLocalRaw, remoteRaw] = await Promise.all([
          AsyncStorage.getItem(userStorageKey),
          loadBudgetCloudState(authUser.uid),
        ]);
        const userLocalState = normalizeBudgetAppState(
          userLocalRaw ? JSON.parse(userLocalRaw) : null,
          new Date(),
        );
        const remoteState = normalizeBudgetAppState(remoteRaw, new Date());
        const fallbackLocalState =
          pendingGuestResetRef.current && authUser.isAnonymous
            ? {
                ...createInitialBudgetState(new Date()),
                preferences: {
                  appThemeId: latestStateRef.current.preferences.appThemeId,
                  currencyCode: latestStateRef.current.preferences.currencyCode,
                  languageCode: latestStateRef.current.preferences.languageCode,
                  recentCurrencyCodes: latestStateRef.current.preferences.recentCurrencyCodes,
                  recentLanguageCodes: latestStateRef.current.preferences.recentLanguageCodes,
                },
              }
            : latestStateRef.current;

        pendingGuestResetRef.current = false;

        const selectedState =
          userLocalState && remoteState
            ? userLocalState.updatedAt >= remoteState.updatedAt
              ? userLocalState
              : remoteState
            : remoteState ?? userLocalState ?? fallbackLocalState;

        await AsyncStorage.setItem(userStorageKey, JSON.stringify(selectedState));

        if (!remoteState || selectedState.updatedAt > remoteState.updatedAt) {
          await saveBudgetCloudState(authUser.uid, selectedState);
        }

        if (isActive) {
          setAppState(selectedState);
          resetTransactionForm();
          resetCategoryForm();
          resetGoalForm();
          resetAccountForm();
        }

        if (isActive) {
          bootstrappedUserIdRef.current = authUser.uid;
          setCloudState('synced');
        }
      } catch {
        if (isActive) {
          bootstrappedUserIdRef.current = authUser.uid;
          setCloudState('local-only');
        }
      }
    };

    void bootstrapCloud();

    return () => {
      isActive = false;
    };
  }, [authUser, isAuthReady, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setSaveState('saving');

    const timeoutId = setTimeout(() => {
      const persistLocalState = async () => {
        try {
          await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
          if (authUser?.uid) {
            await AsyncStorage.setItem(getUserStorageKey(authUser.uid), JSON.stringify(appState));
          }
          setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      };

      void persistLocalState();
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [appState, authUser?.uid, isHydrated]);

  useEffect(() => {
    if (
      !isHydrated ||
      !isAuthReady ||
      !authUser?.uid ||
      bootstrappedUserIdRef.current !== authUser.uid
    ) {
      return;
    }

    setCloudState('syncing');

    const timeoutId = setTimeout(() => {
      const persistCloudState = async () => {
        try {
          await saveBudgetCloudState(authUser.uid, latestStateRef.current);
          setCloudState('synced');
        } catch {
          setCloudState('local-only');
        }
      };

      void persistCloudState();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [appState, authUser?.uid, isAuthReady, isHydrated]);

  useEffect(() => {
    if (!activeMonth) {
      return;
    }

    if (!activeMonth.categories.some((category) => category.id === expenseCategoryId)) {
      setExpenseCategoryId(activeMonth.categories[0]?.id ?? '');
    }
  }, [activeMonth, expenseCategoryId]);

  useEffect(() => {
    if (editingTransactionId) {
      return;
    }

    if (bankAccounts.length === 0) {
      if (expenseAccountId) {
        setExpenseAccountId('');
      }
      return;
    }

    if (!bankAccounts.some((account) => account.id === expenseAccountId)) {
      setExpenseAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, editingTransactionId, expenseAccountId]);

  useEffect(() => {
    if (!activeMonth || editingTransactionId) {
      return;
    }

    setExpenseDate(getDefaultExpenseDate(activeMonth.id));
    setShowExpenseDatePicker(false);
  }, [activeMonth?.id, editingTransactionId]);

  useEffect(() => {
    setExpenseAiSuggestion(null);
    setExpenseAiError('');
  }, [activeMonth.id, expenseAmount, expenseNote]);

  const expenseDateBounds = useMemo(
    () => getMonthBounds(activeMonth.id),
    [activeMonth.id],
  );

  const handleExpenseDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setExpenseDate(clampDateToMonth(selectedDate, activeMonth.id));
  };

  const openExpenseDatePicker = () => {
    if (!activeMonth) {
      return;
    }

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: expenseDate,
        minimumDate: expenseDateBounds.start,
        maximumDate: expenseDateBounds.end,
        is24Hour: true,
        onChange: handleExpenseDateChange,
      });
      return;
    }

    setShowExpenseDatePicker((current) => !current);
  };

  const updateMonthlyLimit = (value: string) => {
    if (!activeMonth) {
      return;
    }

    updateActiveMonth((month) => ({
      ...month,
      monthlyLimit: value,
    }));
  };

  const toggleAccountKind = (kind: BankAccountKind) => {
    setAccountKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );
  };

  const submitBankAccount = () => {
    const trimmedName = accountName.trim();

    if (!trimmedName) {
      return;
    }

    const nextCustomKinds = parseBankAccountCustomKinds(accountCustomKindsText);
    const nextKinds: BankAccountKind[] =
      accountKinds.length > 0 ? accountKinds : nextCustomKinds.length > 0 ? [] : ['spending'];

    const duplicateAccount = bankAccounts.find(
      (account) =>
        account.id !== editingAccountId && account.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicateAccount) {
      Alert.alert('Account already exists', `${duplicateAccount.name} is already in your account list.`);
      return;
    }

    const nextAccountId = editingAccountId ?? createId('acct');

    updateAppState((current) => ({
      ...current,
      accounts: editingAccountId
        ? current.accounts.map((account) =>
            account.id === editingAccountId
              ? {
                  ...account,
                  name: trimmedName,
                  kinds: nextKinds,
                  customKinds: nextCustomKinds,
                }
              : account,
          )
        : [
            {
              id: nextAccountId,
              name: trimmedName,
              kinds: nextKinds,
              customKinds: nextCustomKinds,
            },
            ...current.accounts,
          ],
    }));

    if (!editingAccountId) {
      setExpenseAccountId((current) => current || nextAccountId);
    }

    setIsAccountSheetOpen(false);
    resetAccountForm();
  };

  const editBankAccount = (account: BankAccount) => {
    openAccountSheet(account);
  };

  const deleteBankAccount = (account: BankAccount) => {
    const usageCount = accountUsageCounts.get(account.id) ?? 0;

    Alert.alert(
      'Delete bank account?',
      usageCount > 0
        ? `${account.name} is attached to ${usageCount} expense${usageCount === 1 ? '' : 's'}. Deleting it will clear that tag from those entries.`
        : `Remove ${account.name} from your account list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            updateAppState((current) => ({
              ...current,
              accounts: current.accounts.filter((entry) => entry.id !== account.id),
              months: current.months.map((month) => ({
                ...month,
                transactions: month.transactions.map((transaction) =>
                  transaction.accountId === account.id
                    ? { ...transaction, accountId: undefined }
                    : transaction,
                ),
              })),
            }));

            if (expenseAccountId === account.id) {
              setExpenseAccountId('');
            }

            if (editingAccountId === account.id) {
              setIsAccountSheetOpen(false);
              resetAccountForm();
            }
          },
        },
      ],
    );
  };

  const generateAiMonthlyReview = async () => {
    if (activeMonth.categories.length === 0) {
      setAiReviewErrorByMonthId((current) => ({
        ...current,
        [activeMonth.id]: 'Add at least one category before generating a monthly review.',
      }));
      return;
    }

    setAiReviewBusyMonthId(activeMonth.id);
    setAiReviewErrorByMonthId((current) => ({
      ...current,
      [activeMonth.id]: '',
    }));

    try {
      if (!authUser) {
        await ensureBudgetCloudUser();
      }

      const review = await getBudgetAiMonthlyReview(aiReviewPayload);

      if (!review) {
        throw new Error('No AI review returned.');
      }

      setAiReviewByMonthId((current) => ({
        ...current,
        [activeMonth.id]: {
          ...review,
          generatedAt: Date.now(),
        },
      }));
    } catch {
      setAiReviewErrorByMonthId((current) => ({
        ...current,
        [activeMonth.id]: 'Gemini review is unavailable right now. Try again in a moment.',
      }));
    } finally {
      setAiReviewBusyMonthId((current) => (current === activeMonth.id ? null : current));
    }
  };

  const generateAiExpenseAssist = async () => {
    if (activeMonth.categories.length === 0) {
      setExpenseAiError('Add at least one category before asking AI to classify an expense.');
      return;
    }

    if (!expenseAiAssistPayload.note) {
      setExpenseAiError('Add a note first so AI has something to classify.');
      return;
    }

    if (expenseAiAssistPayload.amount <= 0) {
      setExpenseAiError('Add the amount first so the suggestion has enough context.');
      return;
    }

    setExpenseAiBusy(true);
    setExpenseAiError('');

    try {
      if (!authUser) {
        await ensureBudgetCloudUser();
      }

      const suggestion = await getBudgetAiExpenseAssist(expenseAiAssistPayload);

      if (!suggestion) {
        throw new Error('No AI expense suggestion returned.');
      }

      setExpenseAiSuggestion({
        ...suggestion,
        generatedAt: Date.now(),
      });
    } catch {
      setExpenseAiError('Gemini could not suggest a match right now. Try again in a moment.');
    } finally {
      setExpenseAiBusy(false);
    }
  };

  const applyExpenseAiSuggestion = () => {
    if (!expenseAiSuggestion) {
      return;
    }

    setExpenseCategoryId(expenseAiSuggestion.categoryId);
    setExpenseRecurring(expenseAiSuggestion.recurring);

    if (expenseAiSuggestion.accountId) {
      setExpenseAccountId(expenseAiSuggestion.accountId);
    }
  };

  const generateAiImportCleanup = async () => {
    if (aiImportCleanupPayload.categories.length === 0) {
      setImportCleanupError('Add or import categories first so the cleanup review has something to inspect.');
      return;
    }

    setImportCleanupBusy(true);
    setImportCleanupError('');

    try {
      if (!authUser) {
        await ensureBudgetCloudUser();
      }

      const review = await getBudgetAiImportCleanup(aiImportCleanupPayload);

      if (!review) {
        throw new Error('No AI cleanup review returned.');
      }

      setImportCleanupReview({
        ...review,
        generatedAt: Date.now(),
      });
    } catch {
      setImportCleanupError('Gemini cleanup review is unavailable right now. Try again in a moment.');
    } finally {
      setImportCleanupBusy(false);
    }
  };

  const generateAiMonthPlanner = async () => {
    if (monthlyLimitNumber <= 0) {
      setMonthPlannerErrorByMonthId((current) => ({
        ...current,
        [activeMonth.id]: 'Set the month amount first so AI can size the starter plan.',
      }));
      return;
    }

    if (aiMonthPlannerPayload.historyCategories.length === 0) {
      setMonthPlannerErrorByMonthId((current) => ({
        ...current,
        [activeMonth.id]: 'Track at least one earlier month before asking AI for a starter plan.',
      }));
      return;
    }

    setMonthPlannerBusyMonthId(activeMonth.id);
    setMonthPlannerErrorByMonthId((current) => ({
      ...current,
      [activeMonth.id]: '',
    }));

    try {
      if (!authUser) {
        await ensureBudgetCloudUser();
      }

      const planner = await getBudgetAiMonthPlanner(aiMonthPlannerPayload);

      if (!planner) {
        throw new Error('No AI month planner returned.');
      }

      setMonthPlannerByMonthId((current) => ({
        ...current,
        [activeMonth.id]: {
          ...planner,
          generatedAt: Date.now(),
        },
      }));
    } catch {
      setMonthPlannerErrorByMonthId((current) => ({
        ...current,
        [activeMonth.id]: 'Gemini starter plan is unavailable right now. Try again in a moment.',
      }));
    } finally {
      setMonthPlannerBusyMonthId((current) => (current === activeMonth.id ? null : current));
    }
  };

  const applyAiPlannerSuggestion = (suggestion: MonthPlannerReview['suggestedCategories'][number]) => {
    setEditingCategoryId(null);
    setCategoryName(suggestion.name);
    setCategoryPlanned(String(Number(suggestion.planned.toFixed(2))));
    setCategorySubcategoriesText(suggestion.subcategories.join(', '));
    setShowCategorySubcategories(suggestion.subcategories.length > 0);
    setCategoryBucket(suggestion.bucket as CategoryBucket);
    setCategoryBucketMode('manual');
    setCategoryRecurring(suggestion.recurring);
    setShowCategoryAdvanced(false);
    setPlanSetupStep('categories');
  };

  const selectMonth = (monthId: string) => {
    updateAppState((current) => ({
      ...current,
      activeMonthId: monthId,
    }));
    resetTransactionForm();
    resetCategoryForm();
    const nextMonth = sortedMonths.find((month) => month.id === monthId);
    if (nextMonth) {
      const nextMonthlyLimit = Number(nextMonth.monthlyLimit) || 0;
      const nextTotalPlanned = getTotalPlanned(nextMonth);
      setPlanSetupStep(
        getSuggestedBudgetSetupStep(
          nextMonthlyLimit,
          nextMonth.categories.length,
          nextMonthlyLimit - nextTotalPlanned,
        ),
      );
    }
  };

  const rollToNextMonth = () => {
    if (!activeMonth) {
      return;
    }

    const nextMonthId = addMonths(activeMonth.id, 1);

    updateAppState((current) => {
      if (current.months.some((month) => month.id === nextMonthId)) {
        return {
          ...current,
          activeMonthId: nextMonthId,
        };
      }

      return {
        ...current,
        activeMonthId: nextMonthId,
        months: [rollMonthForward(activeMonth, nextMonthId), ...current.months],
      };
    });
  };

  const openBudgetBuilder = () => {
    resetCategoryForm();
    setPlanSetupStep(activeMonth.categories.length > 0 || monthlyLimitNumber > 0 ? 'categories' : suggestedPlanSetupStep);
    setActiveScreen('plan');
  };

  const openPlanCategories = () => {
    resetCategoryForm();
    setPlanSetupStep(monthlyLimitNumber > 0 ? 'categories' : 'limit');
    setActiveScreen('plan');
  };

  const startBudgetSetup = () => {
    if (monthlyLimitNumber <= 0) {
      return;
    }

    resetCategoryForm();
    setPlanSetupStep('categories');
  };

  const replaceMonthWithBudgetCopy = (sourceMonth: typeof activeMonth, targetMonthId: string) => {
    if (!sourceMonth) {
      return;
    }

    const copiedMonth = copyMonthBudget(sourceMonth, targetMonthId);

    updateAppState((current) => ({
      ...current,
      activeMonthId: targetMonthId,
      months: current.months.some((month) => month.id === targetMonthId)
        ? current.months.map((month) => (month.id === targetMonthId ? copiedMonth : month))
        : [copiedMonth, ...current.months],
    }));

    resetTransactionForm();
    resetCategoryForm();
    resetGoalForm();
    resetAccountForm();
    setPlanSetupStep(
      getSuggestedBudgetSetupStep(
        Number(copiedMonth.monthlyLimit) || 0,
        copiedMonth.categories.length,
        (Number(copiedMonth.monthlyLimit) || 0) - getTotalPlanned(copiedMonth),
      ),
    );
    setActiveScreen('plan');
  };

  const copyPreviousBudgetIntoActiveMonth = () => {
    if (!previousBudgetMonth) {
      return;
    }

    const hasExistingMonthData =
      activeMonth.categories.length > 0 || activeMonth.transactions.length > 0;

    const applyCopy = () => replaceMonthWithBudgetCopy(previousBudgetMonth, activeMonth.id);

    if (!hasExistingMonthData) {
      applyCopy();
      return;
    }

    Alert.alert(
      'Replace this month with the last budget?',
      `This will replace the current ${activeMonthName.toLowerCase()} plan and clear its transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: applyCopy,
        },
      ],
    );
  };

  const handleCategoryNameChange = (value: string) => {
    setCategoryName(value);

    if (categoryBucketMode === 'auto') {
      setCategoryBucket(inferCategoryBucket(value));
    }
  };

  const setAutoCategoryBucket = () => {
    setCategoryBucketMode('auto');
    setCategoryBucket(inferCategoryBucket(categoryName));
  };

  const setManualCategoryBucket = (bucket: CategoryBucket) => {
    setCategoryBucketMode('manual');
    setCategoryBucket(bucket);
  };

  const copyActiveBudgetToNewMonth = () => {
    if (!activeMonth || activeMonth.categories.length === 0) {
      return;
    }

    const existingMonthIds = new Set(appState.months.map((month) => month.id));
    let targetMonthId = addMonths(activeMonth.id, 1);

    while (existingMonthIds.has(targetMonthId)) {
      targetMonthId = addMonths(targetMonthId, 1);
    }

    replaceMonthWithBudgetCopy(activeMonth, targetMonthId);
  };

  const submitTransaction = () => {
    if (!activeMonth) {
      return;
    }

    const amount = Number(expenseAmount);

    if (!expenseCategoryId || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const nextDate = clampDateToMonth(expenseDate, activeMonth.id).toISOString();

    updateActiveMonth((month) => ({
      ...month,
      transactions: editingTransactionId
        ? month.transactions.map((transaction) =>
            transaction.id === editingTransactionId
              ? {
                  ...transaction,
                  amount,
                  note: expenseNote.trim(),
                  categoryId: expenseCategoryId,
                  accountId: expenseAccountId || undefined,
                  recurring: expenseRecurring,
                  happenedAt: nextDate,
                }
              : transaction,
          )
        : [
            {
              id: createId('txn'),
              amount,
              note: expenseNote.trim(),
              categoryId: expenseCategoryId,
              accountId: expenseAccountId || undefined,
              recurring: expenseRecurring,
              happenedAt: nextDate,
            },
            ...month.transactions,
          ],
    }));

    setIsExpenseSheetOpen(false);
    resetTransactionForm();
  };

  const editTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setExpenseAmount(String(transaction.amount));
    setExpenseNote(transaction.note);
    setExpenseCategoryId(transaction.categoryId);
    setExpenseAccountId(transaction.accountId ?? '');
    setExpenseDate(clampDateToMonth(new Date(transaction.happenedAt), activeMonth.id));
    setExpenseRecurring(transaction.recurring);
    setShowExpenseDatePicker(false);
    setIsExpenseSheetOpen(true);
    setActiveScreen('spend');
  };

  const deleteTransaction = (transactionId: string) => {
    if (!activeMonth) {
      return;
    }

    Alert.alert('Delete expense?', 'This entry will be removed from the month history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          updateActiveMonth((month) => ({
            ...month,
            transactions: month.transactions.filter((transaction) => transaction.id !== transactionId),
          })),
      },
    ]);
  };

  const submitCategory = ({ keepEditing = false }: { keepEditing?: boolean } = {}) => {
    if (!activeMonth) {
      return;
    }

    const planned = Number(categoryPlanned);
    const trimmedName = categoryName.trim();
    const nextSubcategories = parseSubcategoryInput(categorySubcategoriesText);

    if (!trimmedName || Number.isNaN(planned) || planned <= 0) {
      return;
    }

    updateActiveMonth((month) => ({
      ...month,
      categories: editingCategoryId
        ? month.categories.map((category) =>
            category.id === editingCategoryId
              ? {
                  ...category,
                  name: trimmedName,
                  planned,
                  subcategories: nextSubcategories,
                  bucket: categoryBucket,
                  recurring: categoryRecurring,
                  themeId: categoryThemeId,
                }
              : category,
          )
        : [
            {
              id: createId('cat'),
              name: trimmedName,
              planned,
              subcategories: nextSubcategories,
              bucket: categoryBucket,
              recurring: categoryRecurring,
              themeId: categoryThemeId,
            },
            ...month.categories,
          ],
    }));

    if (keepEditing && !editingCategoryId) {
      resetCategoryForm();
      setPlanSetupStep('categories');
      return;
    }

    setPlanSetupStep(
      keepEditing
        ? 'categories'
        : getSuggestedBudgetSetupStep(
            monthlyLimitNumber,
            editingCategoryId ? activeMonth.categories.length : activeMonth.categories.length + 1,
            monthlyLimitNumber > 0
              ? monthlyLimitNumber - projectedAssignedTotal
              : allocationDifference,
          ),
    );
    resetCategoryForm();
  };

  const editCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryPlanned(String(category.planned));
    setCategorySubcategoriesText(category.subcategories.join(', '));
    setShowCategorySubcategories(category.subcategories.length > 0);
    setCategoryBucket(category.bucket);
    setCategoryBucketMode('manual');
    setCategoryRecurring(category.recurring);
    setCategoryThemeId(category.themeId);
    setShowCategoryAdvanced(true);
    setPlanSetupStep('categories');
    setActiveScreen('plan');
  };

  const applyCategoryPlanSuggestion = (amount: number) => {
    setCategoryPlanned(String(Number(amount.toFixed(2))));
  };

  const openInlineSubcategoryEditor = (category: Category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInlineSubcategoryCategoryId(category.id);
    setInlineSubcategoryText(category.subcategories.join(', '));
  };

  const closeInlineSubcategoryEditor = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInlineSubcategoryCategoryId(null);
    setInlineSubcategoryText('');
  };

  const saveInlineSubcategories = (categoryId: string) => {
    if (!activeMonth) {
      return;
    }

    updateActiveMonth((month) => ({
      ...month,
      categories: month.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subcategories: parseSubcategoryInput(inlineSubcategoryText),
            }
          : category,
      ),
    }));

    closeInlineSubcategoryEditor();
  };

  const duplicateCategoryDraft = (category: Category) => {
    setEditingCategoryId(null);
    setCategoryName(`${category.name} copy`);
    setCategoryPlanned(String(category.planned));
    setCategorySubcategoriesText('');
    setShowCategorySubcategories(false);
    setCategoryBucket(category.bucket);
    setCategoryBucketMode('manual');
    setCategoryRecurring(category.recurring);
    setCategoryThemeId(category.themeId);
    setShowCategoryAdvanced(false);
    setPlanSetupStep('categories');
    setActiveScreen('plan');
    closeInlineSubcategoryEditor();
  };

  const deleteCategory = (categoryId: string) => {
    if (!activeMonth) {
      return;
    }

    Alert.alert(
      'Delete category?',
      'This also removes any expenses attached to the category in this month.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            updateActiveMonth((month) => ({
              ...month,
              categories: month.categories.filter((category) => category.id !== categoryId),
              transactions: month.transactions.filter(
                (transaction) => transaction.categoryId !== categoryId,
              ),
            })),
        },
      ],
    );
  };

  const customizePreset = (preset: (typeof quickPresets)[number]) => {
    setEditingCategoryId(null);
    setCategoryName(preset.name);
    setCategoryPlanned(String(preset.planned));
    setCategorySubcategoriesText('');
    setShowCategorySubcategories(false);
    setCategoryBucket(preset.bucket);
    setCategoryBucketMode('manual');
    setCategoryRecurring(preset.recurring);
    setCategoryThemeId(preset.themeId);
    setShowCategoryAdvanced(false);
    setPlanSetupStep('categories');
  };

  const submitGoal = () => {
    const target = Number(goalTarget);
    const saved = Number(goalSaved || '0');
    const trimmedName = goalName.trim();

    if (!trimmedName || Number.isNaN(target) || target <= 0 || Number.isNaN(saved) || saved < 0) {
      return;
    }

    updateAppState((current) => ({
      ...current,
      goals: editingGoalId
        ? current.goals.map((goal) =>
            goal.id === editingGoalId
              ? {
                  ...goal,
                  name: trimmedName,
                  target,
                  saved,
                  themeId: goalThemeId,
                }
              : goal,
          )
        : [
            {
              id: createId('goal'),
              name: trimmedName,
              target,
              saved,
              themeId: goalThemeId,
            },
            ...current.goals,
          ],
    }));

    resetGoalForm();
  };

  const editGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTarget(String(goal.target));
    setGoalSaved(String(goal.saved));
    setGoalThemeId(goal.themeId);
    setActiveScreen('plan');
  };

  const deleteGoal = (goalId: string) => {
    Alert.alert('Delete goal?', 'This removes the goal from your savings section.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          updateAppState((current) => ({
            ...current,
            goals: current.goals.filter((goal) => goal.id !== goalId),
          })),
      },
    ]);
  };

  const shareExportedFile = async (
    uri: string,
    options: { dialogTitle: string; mimeType: string; UTI?: string },
  ) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, options);
      return;
    }

    Alert.alert('File created', `Saved export file to ${uri}`);
  };

  const applyImportedState = (nextState: BudgetAppState, successMessage: string) => {
    setAppState(nextState);
    resetTransactionForm();
    resetCategoryForm();
    resetGoalForm();
    resetAccountForm();
    setImportCleanupReview(null);
    setImportCleanupError('');
    setActiveScreen('home');
    Alert.alert('Import complete', successMessage);
  };

  const exportJsonBackup = async () => {
    try {
      if (!FileSystem.cacheDirectory) {
        Alert.alert('Export unavailable', 'The device file cache is not available.');
        return;
      }

      const backupUri = `${FileSystem.cacheDirectory}budget-buddy-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(backupUri, JSON.stringify(appState, null, 2));

      await shareExportedFile(backupUri, {
        dialogTitle: 'Export JSON backup',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } catch {
      Alert.alert('Export failed', 'The JSON backup could not be created.');
    }
  };

  const exportCsvLedger = async () => {
    try {
      if (!FileSystem.cacheDirectory) {
        Alert.alert('Export unavailable', 'The device file cache is not available.');
        return;
      }

      const csvUri = `${FileSystem.cacheDirectory}budget-buddy-ledger-${activeMonth.id}.csv`;
      await FileSystem.writeAsStringAsync(csvUri, buildLedgerCsv(appState));
      await shareExportedFile(csvUri, {
        dialogTitle: 'Export CSV ledger',
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert('Export failed', 'The CSV ledger could not be created.');
    }
  };

  const exportWorkbook = async () => {
    try {
      if (!FileSystem.cacheDirectory) {
        Alert.alert('Export unavailable', 'The device file cache is not available.');
        return;
      }

      const workbookUri = `${FileSystem.cacheDirectory}budget-buddy-workbook-${activeMonth.id}.xlsx`;
      await FileSystem.writeAsStringAsync(workbookUri, buildWorkbookBase64(appState), {
        encoding: FileSystem.EncodingType.Base64,
      });
      await shareExportedFile(workbookUri, {
        dialogTitle: 'Export XLSX workbook',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch {
      Alert.alert('Export failed', 'The XLSX workbook could not be created.');
    }
  };

  const exportPdfReport = async () => {
    try {
      const html = buildBudgetPdfHtml(appState, activeMonth);
      const result = await Print.printToFileAsync({ html });
      const importablePdfBase64 = await buildImportableBudgetPdfBase64(
        await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        }),
        appState,
        activeMonth,
      );
      await FileSystem.writeAsStringAsync(result.uri, importablePdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await shareExportedFile(result.uri, {
        dialogTitle: 'Export PDF report',
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Export failed', 'The PDF report could not be created.');
    }
  };

  const importPdfBudgetFile = async (uri: string) => {
    const base64Content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const appPdfState = await importBudgetPdfBase64(base64Content, new Date());

    if (appPdfState) {
      return {
        state: appPdfState,
        message: 'Budget data was restored from the app-generated PDF report.',
      };
    }
    let extractedText = '';

    if (isPdfTextExtractAvailable()) {
      try {
        extractedText = await extractPdfText(uri);
      } catch {
        extractedText = '';
      }
    }

    if (!extractedText.trim()) {
      extractedText = await extractPdfTextWithPdfJs(uri);
    }

    const importedState = importISaveMoneyPdfText(extractedText, new Date());

    if (!importedState) {
      return null;
    }

    return {
      state: importedState,
      message: 'Budget data was imported from the iSaveMoney PDF export.',
    };
  };

  const importDataFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/json',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/pdf',
        ],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      const filename = asset.name?.toLowerCase() ?? '';
      const extension = filename.split('.').pop() ?? '';

      let normalized: BudgetAppState | null = null;
      let successMessage = 'Your budget data has been restored from the JSON backup.';

      if (extension === 'pdf' || asset.mimeType === 'application/pdf') {
        const pdfImport = await importPdfBudgetFile(asset.uri);
        normalized = pdfImport?.state ?? null;
        successMessage = pdfImport?.message ?? successMessage;
      } else if (extension === 'json' || asset.mimeType === 'application/json') {
        const fileContent = await FileSystem.readAsStringAsync(asset.uri);
        normalized = normalizeBudgetAppState(JSON.parse(fileContent), new Date());
      } else if (extension === 'csv' || asset.mimeType === 'text/csv') {
        const fileContent = await FileSystem.readAsStringAsync(asset.uri);
        normalized = importLedgerCsv(fileContent, new Date());
      } else if (extension === 'xlsx' || extension === 'xls') {
        const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        normalized = importWorkbookBase64(fileContent, new Date());
      }

      if (!normalized) {
        Alert.alert(
          'Import failed',
          'That file could not be read. Use a Budget Buddy JSON backup, CSV ledger, XLSX workbook, an app-generated PDF report, or an iSaveMoney digital PDF export.',
        );
        return;
      }

      applyImportedState(
        normalized,
        extension === 'pdf'
          ? successMessage
          : extension === 'csv'
          ? 'CSV data was imported into a new budget state.'
          : extension === 'xlsx' || extension === 'xls'
            ? 'XLSX workbook was restored successfully.'
            : successMessage,
      );
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof Error && error.message
          ? error.message
          : 'The selected file could not be imported.',
      );
    }
  };

  const exportActions = [
    {
      key: 'pdf',
      badge: 'PDF',
      title: 'PDF report',
      description: 'Best for sharing a polished monthly summary.',
      onPress: exportPdfReport,
      primary: true,
    },
    {
      key: 'csv',
      badge: 'CSV',
      title: 'CSV ledger',
      description: 'Open transactions and category rows in any spreadsheet.',
      onPress: exportCsvLedger,
      primary: false,
    },
    {
      key: 'xlsx',
      badge: 'XLSX',
      title: 'Excel workbook',
      description: 'Keep sheets, tabs, and a richer workbook structure.',
      onPress: exportWorkbook,
      primary: false,
    },
    {
      key: 'json',
      badge: 'JSON',
      title: 'Full backup',
      description: 'Restore the whole app state later without losing structure.',
      onPress: exportJsonBackup,
      primary: false,
    },
  ] as const;

  const renderExpenseForm = () => {
    if (activeMonth.categories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Start with a category</Text>
          <Text style={styles.emptyText}>
            Add your first budget lane in Plan, then come back here to log expenses against it.
          </Text>
          <View style={styles.emptyActionRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                resetTransactionForm();
                openPlanCategories();
              }}
            >
              <Text style={styles.secondaryButtonText}>Open plan</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Quick amounts</Text>
          <View style={styles.filterRowCompact}>
            {[5, 10, 20, 50, 100].map((amount) => {
              const selected = expenseAmount === String(amount);

              return (
                <Pressable
                  key={amount}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => setExpenseAmount(String(amount))}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {formatCurrency(amount)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formShell}>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <TextInput
              style={styles.fieldInput}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              keyboardType="numeric"
              placeholder="42"
              placeholderTextColor={currentTheme.placeholder}
              selectionColor={currentTheme.accent}
            />
          </View>

          <View style={[styles.fieldCard, styles.fieldWide]}>
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={styles.fieldInput}
              value={expenseNote}
              onChangeText={setExpenseNote}
              placeholder="Lunch, fuel, pharmacy..."
              placeholderTextColor={currentTheme.placeholder}
              selectionColor={currentTheme.accent}
            />
          </View>
        </View>

        <View style={styles.sectionActionRow}>
          <Pressable
            style={[
              styles.tertiaryButton,
              (expenseAiBusy ||
                !expenseAiAssistPayload.note ||
                expenseAiAssistPayload.amount <= 0) &&
                styles.buttonDisabled,
            ]}
            onPress={generateAiExpenseAssist}
            disabled={
              expenseAiBusy || !expenseAiAssistPayload.note || expenseAiAssistPayload.amount <= 0
            }
          >
            <Text style={styles.tertiaryButtonText}>
              {expenseAiBusy ? 'Checking...' : 'Suggest from note'}
            </Text>
          </Pressable>

          {expenseAiSuggestion ? (
            <Pressable style={styles.secondaryButton} onPress={applyExpenseAiSuggestion}>
              <Text style={styles.secondaryButtonText}>Apply suggestion</Text>
            </Pressable>
          ) : null}
        </View>

        {expenseAiSuggestion ? (
          <View style={styles.suggestionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.reviewTitle}>Suggested match</Text>
                <Text style={styles.suggestionText}>{expenseAiSuggestion.reason}</Text>
              </View>

              <View style={styles.deltaChip}>
                <Text style={styles.deltaChipText}>{expenseAiSuggestion.model}</Text>
              </View>
            </View>

            <View style={styles.compactHighlightRow}>
              {expenseAiSuggestedCategory ? (
                <View style={styles.compactHighlightChip}>
                  <Text style={styles.compactHighlightText}>{expenseAiSuggestedCategory.name}</Text>
                </View>
              ) : null}
              {expenseAiSuggestedAccount ? (
                <View style={styles.compactHighlightChip}>
                  <Text style={styles.compactHighlightText}>{expenseAiSuggestedAccount.name}</Text>
                </View>
              ) : null}
              <View style={styles.compactHighlightChip}>
                <Text style={styles.compactHighlightText}>
                  {expenseAiSuggestion.recurring ? 'Repeats likely' : 'One-off likely'}
                </Text>
              </View>
              {expenseAiSuggestion.subcategoryHint ? (
                <View style={styles.compactHighlightChip}>
                  <Text style={styles.compactHighlightText}>
                    Hint: {expenseAiSuggestion.subcategoryHint}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {expenseAiError ? <Text style={styles.aiReviewErrorText}>{expenseAiError}</Text> : null}

        <View style={styles.formShell}>
          <Pressable
            style={[styles.fieldCard, styles.fieldWide, styles.dateFieldCard]}
            onPress={openExpenseDatePicker}
          >
            <Text style={styles.fieldLabel}>Date</Text>
            <Text style={styles.fieldValue}>{formatExpenseDate(expenseDate, localeTag)}</Text>
            <Text style={styles.fieldHint}>Inside {getMonthLabel(activeMonth.id, localeTag)}</Text>
          </Pressable>
        </View>

        {showExpenseDatePicker && Platform.OS === 'ios' ? (
          <View style={styles.datePickerCard}>
            <DateTimePicker
              value={expenseDate}
              mode="date"
              display="spinner"
              minimumDate={expenseDateBounds.start}
              maximumDate={expenseDateBounds.end}
              themeVariant="light"
              textColor={currentTheme.text}
              onChange={handleExpenseDateChange}
            />
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Paid from</Text>
        {bankAccounts.length > 0 ? (
          <View style={styles.chipWrap}>
            {bankAccounts.map((account) => {
              const selected = account.id === expenseAccountId;

              return (
                <Pressable
                  key={account.id}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                  onPress={() => setExpenseAccountId(account.id)}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                    {account.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateCompact}>
            <Text style={styles.selectorHint}>
              Add a bank account in Settings if you want expenses tagged by where they were paid from.
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                resetTransactionForm();
                openAccountSheet();
              }}
            >
              <Text style={styles.secondaryButtonText}>Add bank account</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.chipWrap}>
          {activeMonth.categories.map((category) => {
            const theme = categoryThemes[category.themeId];

            return (
              <Pressable
                key={category.id}
                style={[
                  styles.selectionChip,
                  { backgroundColor: theme.chip },
                  category.id === expenseCategoryId && styles.selectionChipActive,
                ]}
                onPress={() => {
                  setExpenseCategoryId(category.id);
                  if (!editingTransactionId) {
                    setExpenseRecurring(category.recurring);
                  }
                }}
              >
                <Text
                  style={[
                    styles.selectionChipText,
                    { color: theme.chipText },
                    category.id === expenseCategoryId && styles.selectionChipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Repeat this expense next month</Text>
          <Switch
            value={expenseRecurring}
            onValueChange={setExpenseRecurring}
            trackColor={{ false: currentTheme.switchOff, true: currentTheme.switchOn }}
            thumbColor={expenseRecurring ? currentTheme.switchThumbOn : currentTheme.switchThumbOff}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButton} onPress={submitTransaction}>
            <Text style={styles.primaryButtonText}>
              {editingTransactionId ? 'Update expense' : 'Add expense'}
            </Text>
          </Pressable>

          <Pressable style={styles.ghostButton} onPress={resetTransactionForm}>
            <Text style={styles.ghostButtonText}>
              {editingTransactionId ? 'Cancel edit' : 'Close'}
            </Text>
          </Pressable>
        </View>
      </>
    );
  };

  const renderBankAccountForm = () => (
    <>
      <View style={styles.formShell}>
        <View style={[styles.fieldCard, styles.fieldWide]}>
          <Text style={styles.fieldLabel}>Account name</Text>
          <TextInput
            style={styles.fieldInput}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="BeoBank, Revolut, MeDirect..."
            placeholderTextColor={currentTheme.placeholder}
            selectionColor={currentTheme.accent}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        {bankAccountKindOrder.map((kind) => (
          <Pressable
            key={kind}
            style={[styles.filterChip, accountKinds.includes(kind) && styles.filterChipActive]}
            onPress={() => toggleAccountKind(kind)}
          >
            <Text
              style={[
                styles.filterChipText,
                accountKinds.includes(kind) && styles.filterChipTextActive,
              ]}
            >
              {bankAccountKindMeta[kind].label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.formShell}>
        <View style={[styles.fieldCard, styles.fieldWide]}>
          <Text style={styles.fieldLabel}>Custom tags</Text>
          <TextInput
            style={styles.fieldInput}
            value={accountCustomKindsText}
            onChangeText={setAccountCustomKindsText}
            placeholder="Pocket, short-term goals, travel reserve..."
            placeholderTextColor={currentTheme.placeholder}
            selectionColor={currentTheme.accent}
          />
          <Text style={styles.fieldHint}>Optional. Separate custom purposes with commas.</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.primaryButton, !accountName.trim() && styles.buttonDisabled]}
          onPress={submitBankAccount}
        >
          <Text style={styles.primaryButtonText}>
            {editingAccountId ? 'Save account' : 'Add account'}
          </Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={closeAccountSheet}>
          <Text style={styles.ghostButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </>
  );

  const renderSettingsScreen = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Open one area at a time</Text>
        <Text style={styles.sectionSubtitle}>
          Keep Settings lighter by focusing on one control lane instead of one long page.
        </Text>
        <Text style={styles.settingsOverviewText}>{settingsOverview}</Text>

        <View style={styles.settingsSectionRow}>
          {settingsSections.map((section) => {
            const selected = activeSettingsSection === section.id;

            return (
              <Pressable
                key={section.id}
                style={[
                  styles.settingsSectionChip,
                  selected && styles.settingsSectionChipActive,
                ]}
                onPress={() => activateSettingsSection(section.id)}
              >
                <Text
                  style={[
                    styles.settingsSectionChipText,
                    selected && styles.settingsSectionChipTextActive,
                  ]}
                >
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeSettingsSection === 'appearance' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <Text style={styles.sectionSubtitle}>
            Keep the app look calm and consistent without taking over the workspace.
          </Text>

          <Pressable
            style={[
              styles.themeCard,
              {
                backgroundColor: currentTheme.surfaceSoft,
                borderColor: currentTheme.accentBorder,
              },
              styles.themeCardActive,
            ]}
            onPress={openThemePicker}
          >
            <View style={styles.themePreviewRow}>
              <View style={[styles.themeHeroSwatch, { backgroundColor: currentTheme.hero }]} />
              <View style={[styles.themeAccentSwatch, { backgroundColor: currentTheme.accent }]} />
              <View style={[styles.themeAccentSwatch, { backgroundColor: currentTheme.orbPrimary }]} />
            </View>
            <Text style={[styles.themeName, { color: currentTheme.text }]}>{currentTheme.name}</Text>
            <Text style={[styles.themeMeta, { color: currentTheme.textMuted }]}>
              {currentTheme.description}
            </Text>
          </Pressable>

          <View style={styles.sectionActionRow}>
            <Pressable style={styles.tertiaryButton} onPress={openThemePicker}>
              <Text style={styles.tertiaryButtonText}>Browse themes</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeSettingsSection === 'locale' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Currency and language</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the defaults the app should use for budgets, exports, dates, and number formatting.
          </Text>

          <Text style={styles.fieldLabel}>Default budget currency</Text>
          <Text style={styles.selectorHint}>
            {currentCurrencyOption
              ? `Using ${currentCurrencyOption.label} (${currentCurrencyOption.code}) for budgets, reports, and forecasts.`
              : 'Pick the currency you want new budgets and exports to use.'}
          </Text>
          <Pressable
            style={[
              styles.selectorDropdownTrigger,
              isCurrencyDropdownOpen && styles.selectorDropdownTriggerActive,
            ]}
            onPress={toggleCurrencyDropdown}
          >
            <View style={styles.selectorDropdownCopy}>
              <Text style={styles.selectorDropdownTitle}>
                {currentCurrencyOption?.label ?? 'Choose a currency'}
              </Text>
              <Text style={styles.selectorDropdownMeta}>
                {currentCurrencyOption
                  ? `${currentCurrencyOption.code} • ${currentCurrencyOption.description}`
                  : 'Browse the full currency list'}
              </Text>
            </View>
            <Text style={styles.selectorDropdownState}>
              {isCurrencyDropdownOpen ? 'Hide' : 'Browse'}
            </Text>
          </Pressable>

          {isCurrencyDropdownOpen ? (
            <View style={styles.selectorDropdownPanel}>
              <View style={[styles.fieldCard, styles.fieldWide, styles.selectorSearchCard]}>
                <Text style={styles.fieldLabel}>Search currencies</Text>
                <TextInput
                  value={currencySearchQuery}
                  onChangeText={setCurrencySearchQuery}
                  placeholder="Search by code, name, or symbol"
                  placeholderTextColor={currentTheme.placeholder}
                  style={styles.fieldInput}
                />
              </View>

              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={styles.selectorDropdownScroll}
              >
                {!normalizedCurrencySearchQuery ? (
                  <>
                    <Text style={styles.selectorGroupLabel}>Main picks</Text>
                    <View style={styles.filterRow}>
                      {featuredCurrencyOptions.map((option) => {
                        const selected = currentCurrencyCode === option.code;

                        return (
                          <Pressable
                            key={option.code}
                            style={[styles.filterChip, selected && styles.filterChipActive]}
                            onPress={() => updateCurrencyCode(option.code)}
                          >
                            <Text
                              style={[styles.filterChipText, selected && styles.filterChipTextActive]}
                            >
                              {option.code}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {recentCurrencyOptions.length > 0 ? (
                      <>
                        <Text style={styles.selectorGroupLabel}>Recently used</Text>
                        <View style={styles.filterRow}>
                          {recentCurrencyOptions.map((option) => {
                            const selected = currentCurrencyCode === option.code;

                            return (
                              <Pressable
                                key={option.code}
                                style={[styles.filterChip, selected && styles.filterChipActive]}
                                onPress={() => updateCurrencyCode(option.code)}
                              >
                                <Text
                                  style={[
                                    styles.filterChipText,
                                    selected && styles.filterChipTextActive,
                                  ]}
                                >
                                  {option.code}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    ) : null}
                  </>
                ) : null}

                <Text style={styles.selectorGroupLabel}>
                  {normalizedCurrencySearchQuery ? 'Matches' : 'All currencies'}
                </Text>
                <View style={styles.selectorList}>
                  {visibleCurrencyOptions.length > 0 ? (
                    visibleCurrencyOptions.map((option) => {
                      const selected = currentCurrencyCode === option.code;

                      return (
                        <Pressable
                          key={option.code}
                          style={[styles.selectorRow, selected && styles.selectorRowActive]}
                          onPress={() => updateCurrencyCode(option.code)}
                        >
                          <View style={styles.selectorRowCopy}>
                            <Text
                              style={[
                                styles.selectorRowTitle,
                                selected && styles.selectorRowTitleActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text
                              style={[
                                styles.selectorRowMeta,
                                selected && styles.selectorRowMetaActive,
                              ]}
                            >
                              {option.description}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.selectorRowCode,
                              selected && styles.selectorRowCodeActive,
                            ]}
                          >
                            {option.code}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.selectorEmptyText}>No currencies matched that search.</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.formDivider} />

          <Text style={styles.fieldLabel}>Language</Text>
          <Text style={styles.selectorHint}>
            {currentLanguageOption
              ? `Using ${currentLanguageOption.label} for date, month, and number formatting across the app.`
              : 'Pick the language that should drive date and number formatting.'}
          </Text>
          <Pressable
            style={[
              styles.selectorDropdownTrigger,
              isLanguageDropdownOpen && styles.selectorDropdownTriggerActive,
            ]}
            onPress={toggleLanguageDropdown}
          >
            <View style={styles.selectorDropdownCopy}>
              <Text style={styles.selectorDropdownTitle}>
                {currentLanguageOption?.label ?? 'Choose a language'}
              </Text>
              <Text style={styles.selectorDropdownMeta}>
                {currentLanguageOption
                  ? `${currentLanguageOption.code.toUpperCase()} • ${getLocaleTag(currentLanguageOption.code)}`
                  : 'Browse the full language list'}
              </Text>
            </View>
            <Text style={styles.selectorDropdownState}>
              {isLanguageDropdownOpen ? 'Hide' : 'Browse'}
            </Text>
          </Pressable>

          {isLanguageDropdownOpen ? (
            <View style={styles.selectorDropdownPanel}>
              <View style={[styles.fieldCard, styles.fieldWide, styles.selectorSearchCard]}>
                <Text style={styles.fieldLabel}>Search languages</Text>
                <TextInput
                  value={languageSearchQuery}
                  onChangeText={setLanguageSearchQuery}
                  placeholder="Search by language or locale"
                  placeholderTextColor={currentTheme.placeholder}
                  style={styles.fieldInput}
                />
              </View>

              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={styles.selectorDropdownScroll}
              >
                {!normalizedLanguageSearchQuery ? (
                  <>
                    <Text style={styles.selectorGroupLabel}>Main picks</Text>
                    <View style={styles.filterRow}>
                      {featuredLanguageOptions.map((option) => {
                        const selected = currentLanguageCode === option.code;

                        return (
                          <Pressable
                            key={option.code}
                            style={[styles.filterChip, selected && styles.filterChipActive]}
                            onPress={() => updateLanguageCode(option.code)}
                          >
                            <Text
                              style={[styles.filterChipText, selected && styles.filterChipTextActive]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {recentLanguageOptions.length > 0 ? (
                      <>
                        <Text style={styles.selectorGroupLabel}>Recently used</Text>
                        <View style={styles.filterRow}>
                          {recentLanguageOptions.map((option) => {
                            const selected = currentLanguageCode === option.code;

                            return (
                              <Pressable
                                key={option.code}
                                style={[styles.filterChip, selected && styles.filterChipActive]}
                                onPress={() => updateLanguageCode(option.code)}
                              >
                                <Text
                                  style={[
                                    styles.filterChipText,
                                    selected && styles.filterChipTextActive,
                                  ]}
                                >
                                  {option.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    ) : null}
                  </>
                ) : null}

                <Text style={styles.selectorGroupLabel}>
                  {normalizedLanguageSearchQuery ? 'Matches' : 'All languages'}
                </Text>
                <View style={styles.selectorList}>
                  {visibleLanguageOptions.length > 0 ? (
                    visibleLanguageOptions.map((option) => {
                      const selected = currentLanguageCode === option.code;

                      return (
                        <Pressable
                          key={option.code}
                          style={[styles.selectorRow, selected && styles.selectorRowActive]}
                          onPress={() => updateLanguageCode(option.code)}
                        >
                          <View style={styles.selectorRowCopy}>
                            <Text
                              style={[
                                styles.selectorRowTitle,
                                selected && styles.selectorRowTitleActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text
                              style={[
                                styles.selectorRowMeta,
                                selected && styles.selectorRowMetaActive,
                              ]}
                            >
                              {`Locale ${getLocaleTag(option.code)}`}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.selectorRowCode,
                              selected && styles.selectorRowCodeActive,
                            ]}
                          >
                            {option.code.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.selectorEmptyText}>No languages matched that search.</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.localePreviewCard}>
            <Text style={styles.localePreviewTitle}>Locale preview</Text>
            <Text style={styles.localePreviewText}>Date: {localeDatePreview}</Text>
            <Text style={styles.localePreviewText}>Month label: {localeMonthPreview}</Text>
            <Text style={styles.localePreviewText}>Budget amount: {localeCurrencyPreview}</Text>
          </View>
        </View>
      ) : null}

      {activeSettingsSection === 'accounts' ? (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Bank accounts</Text>
              <Text style={styles.sectionSubtitle}>
                Add the accounts you actually use, then tag them by the roles they serve for you.
              </Text>
            </View>

            <Pressable style={styles.tertiaryButton} onPress={() => openAccountSheet()}>
              <Text style={styles.tertiaryButtonText}>Add account</Text>
            </Pressable>
          </View>

          <View style={styles.accountBanner}>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>
                {bankAccounts.length} account{bankAccounts.length === 1 ? '' : 's'}
              </Text>
              <Text style={styles.accountMeta}>
                {bankAccounts.length === 0
                  ? 'Keep accounts optional. Add them when you want expenses tagged by where they were paid from.'
                  : `${bankAccounts.reduce(
                      (sum, account) => sum + (accountUsageCounts.get(account.id) ?? 0),
                      0,
                    )} tagged expenses across the current data set.`}
              </Text>
            </View>
          </View>

          {bankAccounts.length === 0 ? (
            <View style={styles.emptyStateCompact}>
              <Text style={styles.selectorHint}>
                No bank accounts added yet. Add the ones you use for recurring bills, daily spending, and savings.
              </Text>
              <Pressable style={styles.secondaryButton} onPress={() => openAccountSheet()}>
                <Text style={styles.secondaryButtonText}>Add bank account</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {bankAccounts.length > 3 ? (
                <View style={styles.sectionActionRow}>
                  <Pressable
                    style={styles.tertiaryButton}
                    onPress={() => setShowAllBankAccounts((current) => !current)}
                  >
                    <Text style={styles.tertiaryButtonText}>
                      {showAllBankAccounts ? 'Show fewer accounts' : `Show all ${bankAccounts.length} accounts`}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.bankAccountList}>
                {visibleBankAccounts.map((account) => (
                  <View key={account.id} style={styles.bankAccountRow}>
                    <View style={styles.bankAccountCopy}>
                      <View style={styles.bankAccountMetaRow}>
                        <Text style={styles.bankAccountTitle}>{account.name}</Text>
                        {account.kinds.map((kind) => (
                          <View key={`${account.id}-${kind}`} style={styles.bucketBadge}>
                            <Text style={styles.bucketBadgeText}>{bankAccountKindMeta[kind].label}</Text>
                          </View>
                        ))}
                        {account.customKinds.map((kind) => (
                          <View key={`${account.id}-custom-${kind}`} style={styles.subcategoryPill}>
                            <Text style={styles.subcategoryPillText}>{kind}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.bankAccountMeta}>
                        {account.kinds.length > 0
                          ? `Used for ${account.kinds
                              .map((kind) => bankAccountKindMeta[kind].label.toLowerCase())
                              .join(', ')}.`
                          : 'Custom account tags only.'}
                        {account.customKinds.length > 0 ? ` Custom: ${account.customKinds.join(', ')}.` : ''}
                      </Text>
                      <Text style={styles.bankAccountUsage}>
                        {accountUsageCounts.get(account.id) ?? 0} tagged expense
                        {(accountUsageCounts.get(account.id) ?? 0) === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View style={styles.inlineActionRowCompact}>
                      <Pressable
                        style={styles.inlineButtonCompact}
                        onPress={() => editBankAccount(account)}
                      >
                        <Text style={styles.inlineButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.inlineButtonCompact, styles.inlineButtonDanger]}
                        onPress={() => deleteBankAccount(account)}
                      >
                        <Text style={styles.inlineButtonDangerText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      ) : null}

      {activeSettingsSection === 'cloud' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account and sync</Text>
          <Text style={styles.sectionSubtitle}>
            Keep the budget recoverable without mixing login credentials into the budget data itself.
          </Text>

          <View style={styles.accountBanner}>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>{accountLabel}</Text>
              <Text style={styles.accountMeta}>
                {authUser?.isAnonymous
                  ? 'Guest mode works immediately, but budgets stay tied to this anonymous session until you create an account.'
                  : 'Budgets are now tied to this login. Passwords stay in Firebase Auth, not in your Firestore budget data.'}
              </Text>
            </View>
          </View>

          {authUser?.isAnonymous ? (
            <>
              <View style={styles.filterRow}>
                {(['create', 'signin'] as AuthMode[]).map((mode) => (
                  <Pressable
                    key={mode}
                    style={[styles.filterChip, authMode === mode && styles.filterChipActive]}
                    onPress={() => setAuthMode(mode)}
                  >
                    <Text style={[styles.filterChipText, authMode === mode && styles.filterChipTextActive]}>
                      {mode === 'create' ? 'Create account' : 'Sign in'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.formShell}>
                <View style={[styles.fieldCard, styles.fieldWide]}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder="name@example.com"
                    placeholderTextColor={currentTheme.placeholder}
                    selectionColor={currentTheme.accent}
                  />
                </View>
              </View>

              <View style={styles.formShell}>
                <View style={[styles.fieldCard, styles.fieldWide]}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete={authMode === 'create' ? 'new-password' : 'password'}
                    placeholder="At least 6 characters"
                    placeholderTextColor={currentTheme.placeholder}
                    selectionColor={currentTheme.accent}
                  />
                </View>
              </View>

              {authStatus ? (
                <Text style={[styles.authStatusText, { color: authStatusColor }]}>{authStatus}</Text>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.primaryButton, authBusy && styles.buttonDisabled]}
                  onPress={submitAuthAction}
                  disabled={authBusy}
                >
                  <Text style={styles.primaryButtonText}>
                    {authBusy ? 'Working...' : authMode === 'create' ? 'Save account' : 'Sign in'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.accountMeta}>
                Signed in budgets sync to Firebase and stay recoverable across reinstalls and devices.
              </Text>
              {authStatus ? (
                <Text style={[styles.authStatusText, { color: authStatusColor }]}>{authStatus}</Text>
              ) : null}
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.tertiaryButton, authBusy && styles.buttonDisabled]}
                  onPress={switchToGuestMode}
                  disabled={authBusy}
                >
                  <Text style={styles.tertiaryButtonText}>
                    {authBusy ? 'Working...' : 'Sign out to guest mode'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : null}

      {activeSettingsSection === 'data' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Import and export</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the right format for sharing, spreadsheet work, or full restore. Imports support JSON, CSV, XLSX, app-generated PDF reports, and supported digital iSaveMoney PDFs.
          </Text>

          <View style={styles.transferGrid}>
            {exportActions.map((action) => (
              <Pressable
                key={action.key}
                style={[
                  styles.transferCard,
                  action.primary ? styles.transferCardPrimary : styles.transferCardSecondary,
                ]}
                onPress={action.onPress}
              >
                <View
                  style={[
                    styles.transferBadge,
                    action.primary ? styles.transferBadgePrimary : styles.transferBadgeSecondary,
                  ]}
                >
                  <Text
                    style={[
                      styles.transferBadgeText,
                      action.primary
                        ? styles.transferBadgeTextPrimary
                        : styles.transferBadgeTextSecondary,
                    ]}
                  >
                    {action.badge}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transferTitle,
                    action.primary ? styles.transferTitlePrimary : styles.transferTitleSecondary,
                  ]}
                >
                  {action.title}
                </Text>
                <Text
                  style={[
                    styles.transferMeta,
                    action.primary ? styles.transferMetaPrimary : styles.transferMetaSecondary,
                  ]}
                >
                  {action.description}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.formDivider} />

          <View style={styles.importPanel}>
            <View style={styles.importPanelCopy}>
              <Text style={styles.importPanelTitle}>Bring data back in</Text>
              <Text style={styles.importPanelText}>
                Restore a backup, import spreadsheet data, or read a supported digital PDF export.
              </Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={importDataFile}>
              <Text style={styles.primaryButtonText}>Import file</Text>
            </Pressable>
          </View>

          <View style={styles.formDivider} />

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>AI cleanup review</Text>
              <Text style={styles.sectionSubtitle}>
                Review category naming, recurring tags, account labels, and possible cleanup moves.
              </Text>
            </View>

            <Pressable
              style={[styles.tertiaryButton, importCleanupBusy && styles.buttonDisabled]}
              onPress={generateAiImportCleanup}
              disabled={importCleanupBusy}
            >
              <Text style={styles.tertiaryButtonText}>
                {importCleanupBusy
                  ? 'Reviewing...'
                  : importCleanupReview
                    ? 'Refresh review'
                    : 'Review current data'}
              </Text>
            </Pressable>
          </View>

          {importCleanupReview ? (
            <>
              <View style={styles.aiReviewMetaRow}>
                <View style={styles.deltaChip}>
                  <Text style={styles.deltaChipText}>{importCleanupReview.model}</Text>
                </View>
              </View>

              <View style={styles.aiReviewSummaryCard}>
                <Text style={styles.reviewTitle}>{importCleanupReview.headline}</Text>
                <Text style={styles.aiReviewSummaryText}>{importCleanupReview.summary}</Text>
              </View>

              <View style={styles.aiReviewWatchout}>
                <Text style={styles.fieldLabel}>Watchout</Text>
                <Text style={styles.suggestionText}>{importCleanupReview.watchout}</Text>
              </View>

              <View style={styles.aiReviewActionList}>
                {importCleanupReview.actions.map((action, index) => (
                  <View key={`${action}-${index}`} style={styles.aiReviewActionRow}>
                    <View style={styles.aiReviewActionIndex}>
                      <Text style={styles.suggestionBadgeText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.aiReviewActionText}>{action}</Text>
                  </View>
                ))}
              </View>

              {importCleanupReview.mergeSuggestions.length > 0 ? (
                <>
                  <Text style={styles.fieldLabel}>Possible merges</Text>
                  <View style={styles.suggestionList}>
                    {importCleanupReview.mergeSuggestions.map((suggestion) => (
                      <View key={`${suggestion.from}-${suggestion.to}`} style={styles.suggestionCard}>
                        <View style={styles.reviewCopy}>
                          <Text style={styles.reviewTitle}>
                            {`${suggestion.from} -> ${suggestion.to}`}
                          </Text>
                          <Text style={styles.suggestionText}>{suggestion.reason}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyStateCompact}>
              <Text style={styles.emptyTitle}>No cleanup review yet</Text>
              <Text style={styles.emptyText}>
                Run one quick AI pass when you want a second opinion on naming, duplicates, and recurring labels.
              </Text>
            </View>
          )}

          {importCleanupError ? (
            <Text style={styles.aiReviewErrorText}>{importCleanupError}</Text>
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (!activeMonth) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loadingText}>Loading your budget...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.orb, styles.orbPrimary]} />
        <View style={[styles.orb, styles.orbSoft]} />
        <View style={[styles.orb, styles.orbWarm]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeScreen === 'home' ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.monthChip}>
                  <Text style={styles.monthChipText}>{getMonthLabel(activeMonth.id, localeTag)}</Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    overCount > 0 ? styles.statusPillAlert : styles.statusPillGood,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      overCount > 0 ? styles.statusPillTextAlert : styles.statusPillTextGood,
                    ]}
                  >
                    {overCount > 0 ? `${overCount} hot` : 'On pace'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>
                {hasActiveBudget ? `${activeMonthName} budget` : `Start ${activeMonthName}`}
              </Text>
              <Text style={styles.heroSubtitle}>
                {hasActiveBudget
                  ? `${formatCurrency(remaining)} left across ${categorySummaries.length} categories this month.`
                  : `Set the monthly amount, then add categories to turn this into the live budget view.`}
              </Text>
              <Text
                style={[
                  styles.storageCaption,
                  saveState === 'error'
                    ? styles.storageCaptionError
                    : cloudState === 'local-only'
                      ? styles.storageCaptionWarning
                      : styles.storageCaptionGood,
                ]}
              >
                {saveMessage}
              </Text>

              <View style={styles.limitPanel}>
                <Text style={styles.limitLabel}>Monthly budget</Text>
                <View style={styles.limitInputShell}>
                  <Text style={styles.limitPrefix}>{activeMonthCurrencyMarker}</Text>
                  <TextInput
                    style={styles.limitInput}
                    value={activeMonth.monthlyLimit}
                    onChangeText={updateMonthlyLimit}
                    keyboardType="numeric"
                    placeholder="1700"
                    placeholderTextColor={currentTheme.placeholder}
                    selectionColor={currentTheme.accent}
                  />
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      monthlyProgress >= 1
                        ? styles.progressFillAlert
                        : monthlyProgress >= 0.82
                          ? styles.progressFillWarning
                          : styles.progressFillGood,
                      { width: `${Math.round(clamp(monthlyProgress) * 100)}%` },
                    ]}
                  />
                </View>

                <View style={styles.progressLabels}>
                  <Text style={styles.progressCaption}>Planned {formatCurrency(totalPlanned)}</Text>
                  <Text style={styles.progressCaption}>
                    {Math.round(clamp(monthlyProgress) * 100)}% spent
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricTile}>
                  <Text style={styles.metricTileLabel}>Left</Text>
                  <Text
                    style={[
                      styles.metricTileValue,
                      remaining < 0 ? styles.metricTileValueAlert : styles.metricTileValueGood,
                    ]}
                  >
                    {formatCurrency(remaining)}
                  </Text>
                </View>

                <View style={styles.metricTile}>
                  <Text style={styles.metricTileLabel}>Spent</Text>
                  <Text
                    style={[
                      styles.metricTileValue,
                      totalSpent > monthlyLimitNumber && monthlyLimitNumber > 0
                        ? styles.metricTileValueAlert
                        : styles.metricTileValueGood,
                    ]}
                  >
                    {formatCurrency(totalSpent)}
                  </Text>
                </View>

                <View style={styles.metricTile}>
                  <Text style={styles.metricTileLabel}>On track</Text>
                  <Text style={styles.metricTileValue}>
                    {categorySummaries.length > 0 ? `${onTrackCount}/${categorySummaries.length}` : '0'}
                  </Text>
                </View>
              </View>

              <View style={styles.heroActionStack}>
                {hasActiveBudget ? (
                  <>
                    <Pressable
                      style={[styles.primaryButton, styles.heroPrimaryButton]}
                      onPress={() => openExpenseCapture()}
                    >
                      <Text style={styles.primaryButtonText}>Add expense</Text>
                    </Pressable>
                    <View style={styles.heroSecondaryRow}>
                      <Pressable style={styles.tertiaryButton} onPress={() => setActiveScreen('spend')}>
                        <Text style={styles.tertiaryButtonText}>Open activity</Text>
                      </Pressable>
                      <Pressable style={styles.tertiaryButton} onPress={openPlanCategories}>
                        <Text style={styles.tertiaryButtonText}>Edit categories</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[styles.primaryButton, styles.heroPrimaryButton]}
                      onPress={openBudgetBuilder}
                    >
                      <Text style={styles.primaryButtonText}>Create budget</Text>
                    </Pressable>
                    {previousBudgetMonth ? (
                      <Pressable style={styles.tertiaryButton} onPress={copyPreviousBudgetIntoActiveMonth}>
                        <Text style={styles.tertiaryButtonText}>
                          Copy {getMonthLabel(previousBudgetMonth.id, localeTag)}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>
            </View>

            {hasActiveBudget ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>Current budget</Text>
                    <Text style={styles.sectionSubtitle}>
                      Keep attention items at the top. Tap a row for details, recent expenses, and a faster add flow.
                    </Text>
                  </View>

                  <Pressable style={styles.tertiaryButton} onPress={() => setActiveScreen('insights')}>
                    <Text style={styles.tertiaryButtonText}>Open insights</Text>
                  </Pressable>
                </View>

                {primaryAlert ? (
                  <View
                    style={[
                      styles.alertCard,
                      primaryAlert.tone === 'good'
                        ? styles.alertCardGood
                        : primaryAlert.tone === 'warning'
                          ? styles.alertCardWarning
                          : styles.alertCardAlert,
                    ]}
                  >
                    <Text style={styles.alertTitle}>{primaryAlert.title}</Text>
                    <Text style={styles.alertBody}>{primaryAlert.body}</Text>
                  </View>
                ) : null}

                {hiddenHealthyBudgetCategoryCount > 0 || showAllBudgetCategories ? (
                  <View style={styles.sectionActionRow}>
                    <Pressable
                      style={styles.tertiaryButton}
                      onPress={() => setShowAllBudgetCategories((current) => !current)}
                    >
                      <Text style={styles.tertiaryButtonText}>
                        {showAllBudgetCategories
                          ? 'Hide healthy categories'
                          : priorityBudgetCategorySummaries.length > 0
                            ? `Show ${hiddenHealthyBudgetCategoryCount} healthy categories`
                            : `Show ${hiddenHealthyBudgetCategoryCount} more categories`}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.currentBudgetList}>
                  {visibleBudgetCategorySummaries.map((summary) => {
                    const theme = categoryThemes[summary.category.themeId];
                    const usageLabel = `${Math.round(clamp(summary.ratio) * 100)}% used`;
                    const previousMatch = previousCategorySummaryByName.get(
                      summary.category.name.trim().toLowerCase(),
                    );
                    const planDelta = previousMatch
                      ? summary.category.planned - previousMatch.category.planned
                      : null;
                    const planDeltaLabel =
                      planDelta && Math.abs(planDelta) >= 1 && previousBudgetMonth
                        ? `${planDelta > 0 ? '+' : '-'}${formatCurrency(Math.abs(planDelta))} vs ${getMonthLabel(
                            previousBudgetMonth.id,
                            localeTag,
                          )}`
                        : null;
                    const detailBits = [
                      summary.category.recurring ? 'Fixed monthly' : 'Flexible',
                      summary.category.subcategories.length > 0
                        ? `${summary.category.subcategories.length} sub${summary.category.subcategories.length === 1 ? '' : 's'}`
                        : null,
                    ].filter(Boolean);
                    const statusLabel =
                      summary.tone === 'alert'
                        ? 'Over plan'
                        : summary.tone === 'warning'
                          ? 'Watch'
                          : null;

                    return (
                      <ScrollView
                        key={summary.category.id}
                        horizontal
                        bounces={false}
                        showsHorizontalScrollIndicator={false}
                        directionalLockEnabled
                        snapToOffsets={[0, swipeRailWidth]}
                        decelerationRate="fast"
                        contentContainerStyle={{ width: swipeViewportWidth + swipeRailWidth }}
                        style={styles.swipeRowShell}
                      >
                        <Pressable
                          style={[styles.currentBudgetRow, { width: swipeViewportWidth }]}
                          onPress={() => openCategoryDetail(summary.category.id)}
                        >
                          <View style={styles.currentBudgetRowHeader}>
                            <View style={styles.currentBudgetRowLead}>
                              <View style={[styles.currentBudgetIcon, { backgroundColor: theme.bubble }]}>
                                <Text style={[styles.currentBudgetIconText, { color: theme.bubbleText }]}>
                                  {getCategoryIcon(summary.category.name)}
                                </Text>
                              </View>

                              <View style={styles.currentBudgetCopy}>
                                <Text style={styles.currentBudgetName}>{summary.category.name}</Text>
                                <Text style={styles.currentBudgetMeta}>
                                  {formatCurrency(summary.spent)} of {formatCurrency(summary.category.planned)}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.currentBudgetAmountBlock}>
                              <Text
                                style={[
                                  styles.currentBudgetAmount,
                                  summary.left < 0 && styles.currentBudgetAmountAlert,
                                ]}
                              >
                                {formatCurrency(summary.left)}
                              </Text>
                              <Text style={styles.currentBudgetAmountMeta}>
                                {summary.left < 0 ? 'over' : 'left'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.currentBudgetRowMeta}>
                            <View style={styles.currentBudgetRowMetaLeft}>
                              <Text style={styles.currentBudgetRowDetail}>
                                {detailBits.join(' • ')}
                              </Text>
                              {planDeltaLabel ? (
                                <Text style={styles.currentBudgetCompareText}>{planDeltaLabel}</Text>
                              ) : null}
                            </View>
                            <View style={styles.currentBudgetRowMetaRight}>
                              {statusLabel ? (
                                <View
                                  style={[
                                    styles.currentBudgetStatusChip,
                                    summary.tone === 'warning'
                                      ? styles.currentBudgetStatusChipWarning
                                      : styles.currentBudgetStatusChipAlert,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.currentBudgetStatusChipText,
                                      summary.tone === 'warning'
                                        ? styles.currentBudgetStatusChipTextWarning
                                        : styles.currentBudgetStatusChipTextAlert,
                                    ]}
                                  >
                                    {statusLabel}
                                  </Text>
                                </View>
                              ) : null}
                              <Text style={styles.currentBudgetUsageText}>{usageLabel}</Text>
                            </View>
                          </View>

                          <View style={[styles.currentBudgetTrack, { backgroundColor: theme.track }]}>
                            <View
                              style={[
                                styles.currentBudgetFill,
                                {
                                  backgroundColor: theme.fill,
                                  width: `${Math.round(clamp(summary.ratio) * 100)}%`,
                                },
                              ]}
                            />
                          </View>
                        </Pressable>

                        <View style={[styles.swipeRail, { width: swipeRailWidth }]}>
                          <Pressable
                            style={[styles.swipeRailButton, styles.swipeRailButtonPrimary]}
                            onPress={() => openExpenseCapture(summary.category.id, null)}
                          >
                            <Text style={styles.swipeRailButtonTextPrimary}>Add</Text>
                          </Pressable>
                          <Pressable
                            style={styles.swipeRailButton}
                            onPress={() => editCategory(summary.category)}
                          >
                            <Text style={styles.swipeRailButtonText}>Edit</Text>
                          </Pressable>
                        </View>
                      </ScrollView>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Start current budget</Text>
                <Text style={styles.sectionSubtitle}>
                  Set the monthly amount, then add the first category to make this screen useful day to day.
                </Text>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No categories yet</Text>
                  <Text style={styles.emptyText}>
                    Once the first category is in place, this screen becomes the live view for the month.
                  </Text>
                  <View style={styles.emptyActionRow}>
                    <Pressable style={styles.primaryButton} onPress={openBudgetBuilder}>
                      <Text style={styles.primaryButtonText}>Create budget</Text>
                    </Pressable>
                    {previousBudgetMonth ? (
                      <Pressable style={styles.ghostButton} onPress={copyPreviousBudgetIntoActiveMonth}>
                        <Text style={styles.ghostButtonText}>
                          Copy {getMonthLabel(previousBudgetMonth.id, localeTag)}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.screenHeader}>
            <Text style={styles.screenHeaderTitle}>{screenMeta[activeScreen].title}</Text>
            <Text style={styles.screenHeaderSubtitle}>{screenMeta[activeScreen].subtitle}</Text>
          </View>
        )}

        {activeScreen === 'spend' ? (
          <>
            <View style={styles.toolbarRow}>
              {activeMonth.categories.length > 0 ? (
                <>
                  <Pressable style={styles.primaryButton} onPress={() => openExpenseCapture()}>
                    <Text style={styles.primaryButtonText}>Add expense</Text>
                  </Pressable>
                  <Pressable style={styles.ghostButton} onPress={openPlanCategories}>
                    <Text style={styles.ghostButtonText}>Edit categories</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.primaryButton} onPress={openPlanCategories}>
                  <Text style={styles.primaryButtonText}>Create categories</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Transactions</Text>
                  <Text style={styles.sectionSubtitle}>
                    Search history, focus on over-budget categories, and clean up mistakes quickly.
                  </Text>
                </View>

                <Pressable
                  style={styles.tertiaryButton}
                  onPress={() => setShowTransactionTools((current) => !current)}
                >
                  <Text style={styles.tertiaryButtonText}>
                    {showTransactionTools || hasTransactionRefinements
                      ? 'Hide filters'
                      : 'Search and filters'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Window</Text>
                <View style={styles.filterRowCompact}>
                  {(
                    [
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This week' },
                      { value: 'month', label: 'This month' },
                    ] as Array<{ value: ActivityScope; label: string }>
                  ).map((scope) => (
                    <Pressable
                      key={scope.value}
                      style={[
                        styles.filterChip,
                        activityScope === scope.value && styles.filterChipActive,
                        !activeMonthIsCurrent && scope.value !== 'month' && styles.buttonDisabled,
                      ]}
                      onPress={() => {
                        if (!activeMonthIsCurrent && scope.value !== 'month') {
                          return;
                        }

                        setActivityScope(scope.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          activityScope === scope.value && styles.filterChipTextActive,
                        ]}
                      >
                        {scope.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {showTransactionTools || hasTransactionRefinements ? (
                <>
                  <View style={styles.formShell}>
                    <View style={[styles.fieldCard, styles.fieldWide]}>
                      <Text style={styles.fieldLabel}>Search</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search note or category"
                        placeholderTextColor={currentTheme.placeholder}
                        selectionColor={currentTheme.accent}
                      />
                    </View>
                  </View>

                  <View style={styles.filterGroup}>
                    <Text style={styles.filterGroupLabel}>Status</Text>
                    <View style={styles.filterRowCompact}>
                      {(
                        [
                          { value: 'all', label: 'All' },
                          { value: 'over', label: 'Over plan' },
                          { value: 'healthy', label: 'Healthy' },
                        ] as Array<{ value: TransactionFilter; label: string }>
                      ).map((filter) => (
                        <Pressable
                          key={filter.value}
                          style={[
                            styles.filterChip,
                            transactionFilter === filter.value && styles.filterChipActive,
                          ]}
                          onPress={() => setTransactionFilter(filter.value)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              transactionFilter === filter.value && styles.filterChipTextActive,
                            ]}
                          >
                            {filter.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.filterGroup}>
                    <Text style={styles.filterGroupLabel}>Sort</Text>
                    <View style={styles.filterRowCompact}>
                      {(
                        [
                          { value: 'recent', label: 'Recent' },
                          { value: 'highest', label: 'Highest' },
                        ] as Array<{ value: TransactionSort; label: string }>
                      ).map((sort) => (
                        <Pressable
                          key={sort.value}
                          style={[
                            styles.filterChip,
                            transactionSort === sort.value && styles.filterChipActive,
                          ]}
                          onPress={() => setTransactionSort(sort.value)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              transactionSort === sort.value && styles.filterChipTextActive,
                            ]}
                          >
                            {sort.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </>
              ) : null}

              {filteredTransactions.length > 0 ? (
                <View style={styles.transactionSummaryRow}>
                  <Text style={styles.transactionSummaryText}>
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
                  </Text>
                  <View style={styles.transactionSummaryRight}>
                    <Text style={styles.transactionSummaryMeta}>
                      {activityScope === 'today'
                        ? 'Today'
                        : activityScope === 'week'
                          ? 'This week'
                          : getMonthLabel(activeMonth.id, localeTag)}
                    </Text>
                    <Text style={styles.transactionSummaryValue}>
                      {formatCurrency(filteredTransactionTotal)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {filteredTransactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>
                    {activeMonth.transactions.length === 0 ? 'No expenses yet' : 'No matching transactions'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {activeMonth.transactions.length === 0
                      ? 'Your ledger will start filling in as soon as you add the first expense above.'
                      : 'Try a different filter or add a new expense above.'}
                  </Text>
                </View>
              ) : (
                visibleTransactions.map((transaction) => {
                  const category = activeMonth.categories.find(
                    (item) => item.id === transaction.categoryId,
                  );
                  const account = transaction.accountId ? accountMap.get(transaction.accountId) : null;
                  const theme = category ? categoryThemes[category.themeId] : categoryThemes.citrus;
                  const tone = categoryToneById.get(transaction.categoryId)?.tone ?? 'good';
                  const title = transaction.note.trim() || category?.name || 'Expense';
                  const toneLabel =
                    tone === 'alert' ? 'Over plan' : tone === 'warning' ? 'Watch' : 'Healthy';

                  return (
                    <ScrollView
                      key={transaction.id}
                      horizontal
                      bounces={false}
                      showsHorizontalScrollIndicator={false}
                      directionalLockEnabled
                      snapToOffsets={[0, swipeRailWidth]}
                      decelerationRate="fast"
                      contentContainerStyle={{ width: swipeViewportWidth + swipeRailWidth }}
                      style={styles.swipeRowShell}
                    >
                      <View style={[styles.transactionCard, { width: swipeViewportWidth }]}>
                        <View style={styles.transactionCardHeader}>
                          <View style={styles.transactionLead}>
                            <View style={[styles.transactionIcon, { backgroundColor: theme.bubble }]}>
                              <Text style={[styles.transactionIconText, { color: theme.bubbleText }]}>
                                {category ? getCategoryIcon(category.name) : '•'}
                              </Text>
                            </View>

                            <View style={styles.transactionCopy}>
                              <Text style={styles.transactionTitle}>{title}</Text>
                              <Text style={styles.transactionMeta}>
                                {formatTransactionDate(transaction.happenedAt, localeTag)}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount)}</Text>
                        </View>

                        <View style={styles.transactionTagRow}>
                          <View style={[styles.transactionTag, { backgroundColor: theme.chip }]}>
                            <Text style={[styles.transactionTagText, { color: theme.chipText }]}>
                              {category?.name ?? 'Uncategorized'}
                            </Text>
                          </View>

                          {account ? (
                            <View style={styles.transactionTag}>
                              <Text style={styles.transactionTagText}>{account.name}</Text>
                            </View>
                          ) : null}

                          {transaction.recurring ? (
                            <View style={styles.transactionTag}>
                              <Text style={styles.transactionTagText}>Recurring</Text>
                            </View>
                          ) : null}

                          <View
                            style={[
                              styles.transactionTag,
                              tone === 'good'
                                ? styles.transactionTagGood
                                : tone === 'warning'
                                  ? styles.transactionTagWarning
                                  : styles.transactionTagAlert,
                            ]}
                          >
                            <Text
                              style={[
                                styles.transactionTagText,
                                tone === 'good'
                                  ? styles.transactionTagTextGood
                                  : tone === 'warning'
                                    ? styles.transactionTagTextWarning
                                    : styles.transactionTagTextAlert,
                              ]}
                            >
                              {toneLabel}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.swipeRail, { width: swipeRailWidth }]}>
                        <Pressable
                          style={[styles.swipeRailButton, styles.swipeRailButtonPrimary]}
                          onPress={() => editTransaction(transaction)}
                        >
                          <Text style={styles.swipeRailButtonTextPrimary}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.swipeRailButton, styles.swipeRailButtonDanger]}
                          onPress={() => deleteTransaction(transaction.id)}
                        >
                          <Text style={styles.swipeRailButtonTextDanger}>Delete</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  );
                })
              )}

              {hiddenTransactionCount > 0 ? (
                <View style={styles.sectionActionRow}>
                  <Pressable
                    style={styles.tertiaryButton}
                    onPress={() => setShowAllTransactions(true)}
                  >
                    <Text style={styles.tertiaryButtonText}>
                      Show {hiddenTransactionCount} more transactions
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {showAllTransactions && !hasTransactionRefinements && filteredTransactions.length > 6 ? (
                <View style={styles.sectionActionRow}>
                  <Pressable
                    style={styles.tertiaryButton}
                    onPress={() => setShowAllTransactions(false)}
                  >
                    <Text style={styles.tertiaryButtonText}>Show fewer transactions</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {activeScreen === 'plan' ? (
          <>
            {isInitialBudgetSetup ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Create budget</Text>
                <Text style={styles.sectionSubtitle}>
                  Start with one monthly amount. After that, you can add categories and subcategories.
                </Text>

                <View style={styles.formShell}>
                  <View style={[styles.fieldCard, styles.fieldWide]}>
                    <Text style={styles.fieldLabel}>Monthly amount</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={activeMonth.monthlyLimit}
                      onChangeText={updateMonthlyLimit}
                      keyboardType="numeric"
                      placeholder="1700"
                      placeholderTextColor={currentTheme.placeholder}
                      selectionColor={currentTheme.accent}
                    />
                    <Text style={styles.fieldHint}>
                      Use the amount you want {activeMonthName.toLowerCase()} to cover.
                    </Text>
                  </View>
                </View>

                {monthlyLimitNumber > 0 ? (
                  <>
                    <Text style={styles.fieldLabel}>Quick guide</Text>
                    <Text style={styles.selectorHint}>
                      You only need the total right now. You can split it into categories next.
                    </Text>
                  </>
                ) : (
                  <Text style={styles.planSetupHint}>
                    Enter the monthly amount first, then the app will open category setup.
                  </Text>
                )}

                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.primaryButton, monthlyLimitNumber <= 0 && styles.buttonDisabled]}
                    onPress={startBudgetSetup}
                  >
                    <Text style={styles.primaryButtonText}>Start budget</Text>
                  </Pressable>

                  {previousBudgetMonth ? (
                    <Pressable style={styles.ghostButton} onPress={copyPreviousBudgetIntoActiveMonth}>
                      <Text style={styles.ghostButtonText}>
                        Copy {getMonthLabel(previousBudgetMonth.id, localeTag)}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : planSetupStep !== 'categories' ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>Budget setup</Text>
                    <Text style={styles.sectionSubtitle}>
                      Keep the monthly amount, categories, and review in one place while you shape the month.
                    </Text>
                  </View>

                  {monthlyLimitNumber > 0 ? (
                    <Pressable style={styles.secondaryButton} onPress={openPlanCategories}>
                      <Text style={styles.secondaryButtonText}>Add categories</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.planStepRow}>
                  {budgetSetupSteps.map((step) => {
                    const isActive = planSetupStep === step;
                    const isDone =
                      (step === 'limit' && monthlyLimitNumber > 0) ||
                      (step === 'categories' && activeMonth.categories.length > 0) ||
                      (step === 'review' &&
                        isBudgetSetupReady &&
                        Math.abs(allocationDifference) <= Math.max(monthlyLimitNumber * 0.05, 25));

                    return (
                      <Pressable
                        key={step}
                        style={[
                          styles.planStepChip,
                          isActive && styles.planStepChipActive,
                          !isActive && isDone && styles.planStepChipDone,
                        ]}
                        onPress={() => setPlanSetupStep(step)}
                      >
                        <Text
                          style={[
                            styles.planStepChipText,
                            isActive && styles.planStepChipTextActive,
                            !isActive && isDone && styles.planStepChipTextDone,
                          ]}
                        >
                          {budgetSetupStepMeta[step].label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.planSetupLead}>{budgetSetupStepMeta[planSetupStep].title}</Text>
                <Text style={styles.sectionSubtitle}>{budgetSetupStepMeta[planSetupStep].subtitle}</Text>

                <View style={styles.planSetupSummaryCard}>
                  <View style={styles.planSetupSummaryRow}>
                    <View style={styles.planSetupMetric}>
                      <Text style={styles.planSetupMetricLabel}>Monthly limit</Text>
                      <Text style={styles.planSetupMetricValue}>
                        {monthlyLimitNumber > 0 ? formatCurrency(monthlyLimitNumber) : 'Set target'}
                      </Text>
                    </View>

                    <View style={styles.planSetupMetric}>
                      <Text style={styles.planSetupMetricLabel}>Assigned</Text>
                      <Text style={styles.planSetupMetricValue}>{formatCurrency(totalPlanned)}</Text>
                    </View>

                    <View style={styles.planSetupMetric}>
                      <Text style={styles.planSetupMetricLabel}>{allocationStatusLabel}</Text>
                      <Text
                        style={[
                          styles.planSetupMetricValue,
                          allocationStatusTone === 'alert'
                            ? styles.planSetupMetricValueAlert
                            : allocationStatusTone === 'good'
                              ? styles.planSetupMetricValueGood
                              : null,
                        ]}
                      >
                        {allocationStatusValue}
                      </Text>
                    </View>

                    <View style={styles.planSetupMetric}>
                      <Text style={styles.planSetupMetricLabel}>Categories</Text>
                      <Text style={styles.planSetupMetricValue}>{activeMonth.categories.length}</Text>
                    </View>
                  </View>

                  {monthlyLimitNumber > 0 ? (
                    <>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            allocationProgress >= 1
                              ? styles.progressFillAlert
                              : allocationProgress >= 0.9
                                ? styles.progressFillWarning
                                : styles.progressFillGood,
                            { width: `${Math.round(clamp(allocationProgress) * 100)}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.progressLabels}>
                        <Text style={styles.progressCaption}>{formatCurrency(totalPlanned)} allocated</Text>
                        <Text style={styles.progressCaption}>
                          {Math.round(clamp(allocationProgress) * 100)}% of limit assigned
                        </Text>
                      </View>
                    </>
                  ) : null}

                  <Text style={styles.planSetupHint}>{budgetSetupSummary}</Text>
                </View>
              </View>
            ) : null}

            {planSetupStep === 'limit' && !isInitialBudgetSetup ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Adjust the budget amount</Text>
                <Text style={styles.sectionSubtitle}>
                  Update the total amount for the month, then keep shaping categories underneath it.
                </Text>

                <View style={styles.formShell}>
                  <View style={[styles.fieldCard, styles.fieldWide]}>
                    <Text style={styles.fieldLabel}>Monthly limit</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={activeMonth.monthlyLimit}
                      onChangeText={updateMonthlyLimit}
                      keyboardType="numeric"
                      placeholder="1700"
                      placeholderTextColor={currentTheme.placeholder}
                      selectionColor={currentTheme.accent}
                    />
                    <Text style={styles.fieldHint}>
                      Use your expected spendable amount for {activeMonthName.toLowerCase()}.
                    </Text>
                  </View>
                </View>

                {monthlyLimitNumber > 0 ? (
                  <>
                    <Text style={styles.fieldLabel}>Target guide</Text>
                    <Text style={styles.selectorHint}>
                      A 50 / 30 / 20 split is a good starting point if you want a balanced plan.
                    </Text>
                    <View style={styles.budgetGuideList}>
                      {bucketSummaries.map((summary) => (
                        <View key={summary.bucket} style={styles.budgetGuideCard}>
                          <View style={styles.budgetGuideHeader}>
                            <Text style={styles.budgetGuideLabel}>
                              {categoryBucketMeta[summary.bucket].label}
                            </Text>
                            <View style={styles.budgetGuideChip}>
                              <Text style={styles.budgetGuideChipText}>
                                {Math.round(summary.targetRatio * 100)}%
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.budgetGuideValue}>{formatCurrency(summary.target)}</Text>
                          <Text style={styles.budgetGuideMeta}>Suggested share of the month</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={styles.planSetupHint}>
                    Add the monthly target first so categories and review can show useful guidance.
                  </Text>
                )}

                <View style={styles.actionRow}>
                  <Pressable
                    style={[
                      styles.primaryButton,
                      styles.planLimitActionButton,
                      monthlyLimitNumber <= 0 && styles.buttonDisabled,
                    ]}
                    onPress={() => setPlanSetupStep(monthlyLimitNumber > 0 ? 'categories' : 'limit')}
                  >
                    <Text style={styles.primaryButtonText}>Continue to categories</Text>
                  </Pressable>

                  {previousBudgetMonth ? (
                    <Pressable
                      style={[styles.ghostButton, styles.planLimitActionButton]}
                      onPress={copyPreviousBudgetIntoActiveMonth}
                    >
                      <Text style={styles.ghostButtonText}>
                        Use {getMonthLabel(previousBudgetMonth.id, localeTag)}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            {planSetupStep === 'categories' ? (
              <View style={styles.card}>
                <View style={styles.planStepRow}>
                  {budgetSetupSteps.map((step) => {
                    const isActive = planSetupStep === step;
                    const isDone =
                      (step === 'limit' && monthlyLimitNumber > 0) ||
                      (step === 'categories' && activeMonth.categories.length > 0) ||
                      (step === 'review' &&
                        isBudgetSetupReady &&
                        Math.abs(allocationDifference) <= Math.max(monthlyLimitNumber * 0.05, 25));

                    return (
                      <Pressable
                        key={step}
                        style={[
                          styles.planStepChip,
                          isActive && styles.planStepChipActive,
                          !isActive && isDone && styles.planStepChipDone,
                        ]}
                        onPress={() => setPlanSetupStep(step)}
                      >
                        <Text
                          style={[
                            styles.planStepChipText,
                            isActive && styles.planStepChipTextActive,
                            !isActive && isDone && styles.planStepChipTextDone,
                          ]}
                        >
                          {budgetSetupStepMeta[step].label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>{categoryCreationTitle}</Text>
                    <Text style={styles.sectionSubtitle}>{categoryCreationSubtitle}</Text>
                  </View>

                  {previousBudgetMonth ? (
                    <Pressable style={styles.secondaryButton} onPress={copyPreviousBudgetIntoActiveMonth}>
                      <Text style={styles.secondaryButtonText}>
                        Use {getMonthLabel(previousBudgetMonth.id, localeTag)}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.planCompactStatusRow}>
                  <View style={styles.planCompactStatusPill}>
                    <Text style={styles.planCompactStatusLabel}>Budget</Text>
                    <Text style={styles.planCompactStatusValue}>
                      {monthlyLimitNumber > 0 ? formatCurrency(monthlyLimitNumber) : 'Set amount'}
                    </Text>
                  </View>
                  <View style={styles.planCompactStatusPill}>
                    <Text style={styles.planCompactStatusLabel}>Assigned</Text>
                    <Text style={styles.planCompactStatusValue}>{formatCurrency(totalPlanned)}</Text>
                  </View>
                  <View
                    style={[
                      styles.planCompactStatusPill,
                      allocationDifference < 0
                        ? styles.planCompactStatusPillAlert
                        : allocationDifference > 0
                          ? styles.planCompactStatusPillGood
                          : styles.planCompactStatusPillNeutral,
                    ]}
                  >
                    <Text style={styles.planCompactStatusLabel}>
                      {allocationDifference < 0 ? 'Over' : 'Left'}
                    </Text>
                    <Text style={styles.planCompactStatusValue}>
                      {formatCurrency(Math.abs(allocationDifference))}
                    </Text>
                  </View>
                </View>

                {monthlyLimitNumber > 0 ? (
                  <View style={styles.suggestionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionHeaderCopy}>
                        <Text style={styles.reviewTitle}>AI starter plan</Text>
                        <Text style={styles.suggestionText}>
                          Pull a few likely categories from earlier months, then apply only what still fits.
                        </Text>
                      </View>

                      <Pressable
                        style={[styles.tertiaryButton, monthPlannerBusy && styles.buttonDisabled]}
                        onPress={generateAiMonthPlanner}
                        disabled={monthPlannerBusy}
                      >
                        <Text style={styles.tertiaryButtonText}>
                          {monthPlannerBusy
                            ? 'Thinking...'
                            : activeMonthPlanner
                              ? 'Refresh plan'
                              : 'Suggest starter lanes'}
                        </Text>
                      </Pressable>
                    </View>

                    {activeMonthPlanner ? (
                      <>
                        <View style={styles.aiReviewMetaRow}>
                          <View style={styles.deltaChip}>
                            <Text style={styles.deltaChipText}>{activeMonthPlanner.model}</Text>
                          </View>
                        </View>

                        <Text style={styles.reviewTitle}>{activeMonthPlanner.headline}</Text>
                        <Text style={styles.suggestionText}>{activeMonthPlanner.summary}</Text>

                        <View style={styles.compactHighlightRow}>
                          {activeMonthPlanner.actions.map((action) => (
                            <View key={action} style={styles.compactHighlightChip}>
                              <Text style={styles.compactHighlightText}>{action}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.suggestionList}>
                          {activeMonthPlanner.suggestedCategories.map((suggestion) => (
                            <View
                              key={`${suggestion.name}-${suggestion.bucket}`}
                              style={styles.suggestionCard}
                            >
                              <View style={styles.sectionHeader}>
                                <View style={styles.sectionHeaderCopy}>
                                  <Text style={styles.reviewTitle}>
                                    {suggestion.name} {formatCurrency(suggestion.planned)}
                                  </Text>
                                  <Text style={styles.suggestionText}>{suggestion.reason}</Text>
                                </View>

                                <Pressable
                                  style={styles.inlineButtonCompact}
                                  onPress={() => applyAiPlannerSuggestion(suggestion)}
                                >
                                  <Text style={styles.inlineButtonText}>Use</Text>
                                </Pressable>
                              </View>

                              <View style={styles.compactHighlightRow}>
                                <View style={styles.compactHighlightChip}>
                                  <Text style={styles.compactHighlightText}>
                                    {categoryBucketMeta[suggestion.bucket as CategoryBucket].label}
                                  </Text>
                                </View>
                                {suggestion.recurring ? (
                                  <View style={styles.compactHighlightChip}>
                                    <Text style={styles.compactHighlightText}>Recurring</Text>
                                  </View>
                                ) : null}
                                {suggestion.subcategories.length > 0 ? (
                                  <View style={styles.compactHighlightChip}>
                                    <Text style={styles.compactHighlightText}>
                                      {suggestion.subcategories.join(', ')}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>

                        <Text style={styles.forecastStatMeta}>{activeMonthPlanner.watchout}</Text>
                      </>
                    ) : (
                      <View style={styles.emptyStateCompact}>
                        <Text style={styles.emptyTitle}>No AI starter plan yet</Text>
                        <Text style={styles.emptyText}>
                          Ask Gemini to pull likely categories from your earlier months, then use any suggestion to prefill the form.
                        </Text>
                      </View>
                    )}

                    {activeMonthPlannerError ? (
                      <Text style={styles.aiReviewErrorText}>{activeMonthPlannerError}</Text>
                    ) : null}
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Common essentials</Text>
                <View style={styles.chipWrap}>
                  {essentialQuickPresets.map((preset) => {
                    const theme = categoryThemes[preset.themeId];
                    const matchingCategory =
                      activeMonth.categories.find(
                        (category) => category.name.toLowerCase() === preset.name.toLowerCase(),
                      ) ?? null;
                    const selectedPreset =
                      (!matchingCategory &&
                        categoryName.trim().toLowerCase() === preset.name.toLowerCase() &&
                        categoryPlanned.trim() === String(preset.planned)) ||
                      false;

                    return (
                      <Pressable
                        key={preset.name}
                        style={[
                          styles.selectionChip,
                          { backgroundColor: theme.chip },
                          (selectedPreset || Boolean(matchingCategory)) && styles.selectionChipActive,
                        ]}
                        onPress={() =>
                          matchingCategory ? editCategory(matchingCategory) : customizePreset(preset)
                        }
                      >
                        <Text
                          style={[
                            styles.selectionChipText,
                            { color: theme.chipText },
                            (selectedPreset || Boolean(matchingCategory)) &&
                              styles.selectionChipTextActive,
                          ]}
                        >
                          {matchingCategory
                            ? `Edit ${preset.name}`
                            : `${preset.name} ${formatCurrency(preset.planned)}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>{editingCategoryId ? 'Category' : 'New category'}</Text>

                <View style={styles.formShell}>
                  <View style={[styles.fieldCard, styles.fieldWide]}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={categoryName}
                      onChangeText={handleCategoryNameChange}
                      placeholder="Subscriptions"
                      placeholderTextColor={currentTheme.placeholder}
                      selectionColor={currentTheme.accent}
                    />
                  </View>

                  <View style={styles.fieldCard}>
                    <Text style={styles.fieldLabel}>Plan</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={categoryPlanned}
                      onChangeText={setCategoryPlanned}
                      keyboardType="numeric"
                      placeholder="120"
                      placeholderTextColor={currentTheme.placeholder}
                      selectionColor={currentTheme.accent}
                    />
                  </View>
                </View>

                {categoryPlanSuggestions.length > 0 ? (
                  <View style={styles.categorySuggestionBlock}>
                    <Text style={styles.fieldLabel}>Recent matches</Text>
                    <View style={styles.chipWrap}>
                      {categoryPlanSuggestions.map((suggestion) => (
                        <Pressable
                          key={suggestion.id}
                          style={styles.secondaryButton}
                          onPress={() => applyCategoryPlanSuggestion(suggestion.amount)}
                        >
                          <Text style={styles.secondaryButtonText}>
                            {suggestion.label} {formatCurrency(suggestion.amount)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {latestHistoricalCategoryMatch ? (
                      <Text style={styles.selectorHint}>
                        Last used in {getMonthLabel(latestHistoricalCategoryMatch.monthId, localeTag)}.
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {showCategorySubcategories || categorySubcategoriesText.trim() ? (
                  <View style={styles.formShell}>
                    <View style={[styles.fieldCard, styles.fieldWide]}>
                      <Text style={styles.fieldLabel}>Subcategories</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={categorySubcategoriesText}
                        onChangeText={setCategorySubcategoriesText}
                        placeholder="Protein, Vitamins, Lab work"
                        placeholderTextColor={currentTheme.placeholder}
                        selectionColor={currentTheme.accent}
                      />
                      <Text style={styles.fieldHint}>
                        Optional. Separate items with commas.
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.categoryHelperRow}>
                  {!showCategorySubcategories ? (
                    <Pressable
                      style={[styles.secondaryButton, styles.categoryToolButton]}
                      onPress={() => setShowCategorySubcategories(true)}
                    >
                      <Text style={styles.secondaryButtonText}>Add subcategories</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={[styles.secondaryButton, styles.categoryToolButton]}
                    onPress={() => setShowCategoryAdvanced((current) => !current)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {showCategoryAdvanced ? 'Hide more options' : 'More options'}
                    </Text>
                  </Pressable>
                </View>

                {categoryQuickStatus ? (
                  <View style={styles.categoryStatusRow}>
                    <View style={styles.categoryStatusPill}>
                      <Text style={styles.categoryStatusPillText}>{categoryQuickStatus}</Text>
                    </View>
                  </View>
                ) : null}

                {showCategoryAdvanced ? (
                  <View style={styles.categoryAdvancedPanel}>
                    <Text style={styles.fieldLabel}>Bucket</Text>
                    <Text style={styles.selectorHint}>{categoryBucketHint}</Text>
                    <View style={styles.chipWrap}>
                      <Pressable
                        style={[
                          styles.filterChip,
                          isCategoryBucketAuto && styles.filterChipActive,
                        ]}
                        onPress={setAutoCategoryBucket}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isCategoryBucketAuto && styles.filterChipTextActive,
                          ]}
                        >
                          Auto
                        </Text>
                      </Pressable>
                      {categoryBucketOrder.map((bucket) => (
                        <Pressable
                          key={bucket}
                          style={[
                            styles.filterChip,
                            !isCategoryBucketAuto && categoryBucket === bucket && styles.filterChipActive,
                          ]}
                          onPress={() => setManualCategoryBucket(bucket)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              !isCategoryBucketAuto &&
                                categoryBucket === bucket &&
                                styles.filterChipTextActive,
                            ]}
                          >
                            {categoryBucketMeta[bucket].label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>Theme</Text>
                    <View style={styles.chipWrap}>
                      {themeCycle.map((themeId) => {
                        const theme = categoryThemes[themeId];

                        return (
                          <Pressable
                            key={themeId}
                            style={[
                              styles.selectionChip,
                              { backgroundColor: theme.chip },
                              categoryThemeId === themeId && styles.selectionChipActive,
                            ]}
                            onPress={() => setCategoryThemeId(themeId)}
                          >
                            <Text
                              style={[
                                styles.selectionChipText,
                                { color: theme.chipText },
                                categoryThemeId === themeId && styles.selectionChipTextActive,
                              ]}
                            >
                              {themeId}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Carry this budget into new months</Text>
                      <Switch
                        value={categoryRecurring}
                        onValueChange={setCategoryRecurring}
                        trackColor={{ false: currentTheme.switchOff, true: currentTheme.switchOn }}
                        thumbColor={
                          categoryRecurring ? currentTheme.switchThumbOn : currentTheme.switchThumbOff
                        }
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.categoryActionRow}>
                  <Pressable
                    style={[styles.primaryButton, styles.categoryActionButton]}
                    onPress={() => submitCategory()}
                  >
                    <Text style={styles.primaryButtonText}>
                      {editingCategoryId ? 'Save category' : 'Add category'}
                    </Text>
                  </Pressable>

                  {!editingCategoryId ? (
                    <Pressable
                      style={[styles.ghostButton, styles.categoryActionButton]}
                      onPress={() => submitCategory({ keepEditing: true })}
                    >
                      <Text style={styles.ghostButtonText}>Save and add another</Text>
                    </Pressable>
                  ) : null}

                  {editingCategoryId ? (
                    <Pressable
                      style={[styles.ghostButton, styles.categoryActionButton]}
                      onPress={resetCategoryForm}
                    >
                      <Text style={styles.ghostButtonText}>Cancel edit</Text>
                    </Pressable>
                  ) : categoryName.trim() || categoryPlanned.trim() || categorySubcategoriesText.trim() ? (
                    <Pressable
                      style={[styles.ghostButton, styles.categoryActionButton]}
                      onPress={resetCategoryForm}
                    >
                      <Text style={styles.ghostButtonText}>Clear form</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.formDivider} />

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>Current categories</Text>
                    <Text style={styles.sectionSubtitle}>
                      Keep essentials visible at the top, then tighten or rename lanes as the plan takes shape.
                    </Text>
                  </View>

                  <View style={styles.headerActionStack}>
                    {activeMonth.categories.length > 0 ? (
                      <>
                        <Pressable
                          style={styles.tertiaryButton}
                          onPress={() => setShowPlanCategoryList((current) => !current)}
                        >
                          <Text style={styles.tertiaryButtonText}>
                            {showPlanCategoryList
                              ? 'Hide current categories'
                              : `Show current categories (${categorySummaries.length})`}
                          </Text>
                        </Pressable>
                        <Pressable style={styles.tertiaryButton} onPress={() => setPlanSetupStep('review')}>
                          <Text style={styles.tertiaryButtonText}>Continue to review</Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>

                {categorySummaries.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No categories added yet</Text>
                    <Text style={styles.emptyText}>
                      Add the first category now, then use subcategories when you want a little more structure inside it.
                    </Text>
                  </View>
                ) : null}

                {!showPlanCategoryList && categorySummaries.length > 0 ? (
                  <View style={styles.planCollapsedSummary}>
                    <Text style={styles.planCollapsedSummaryTitle}>
                      {categorySummaries.length} categories in this month
                    </Text>
                    <Text style={styles.planCollapsedSummaryText}>
                      {formatCurrency(totalPlanned)} assigned across the current plan. Open the list only when you want to edit, duplicate, or trim lanes.
                    </Text>
                  </View>
                ) : null}

                {showPlanCategoryList
                  ? visiblePlanCategorySummaries.map((summary) => {
                  const theme = categoryThemes[summary.category.themeId];

                  return (
                    <View
                      key={summary.category.id}
                      style={[
                        styles.categoryCard,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <View style={styles.categoryTopRow}>
                        <View style={styles.categoryLead}>
                          <View style={[styles.categoryBubble, { backgroundColor: theme.bubble }]}>
                            <Text style={[styles.categoryBubbleText, { color: theme.bubbleText }]}>
                              {getCategoryIcon(summary.category.name)}
                            </Text>
                          </View>

                          <View style={styles.categoryCopy}>
                            <Text style={styles.categoryName}>{summary.category.name}</Text>
                            <View style={styles.categoryMetaRow}>
                              <View style={styles.bucketBadge}>
                            <Text style={styles.bucketBadgeText}>
                              {categoryBucketMeta[summary.category.bucket].label}
                            </Text>
                          </View>
                          {summary.category.recurring ? (
                            <View style={styles.bucketBadge}>
                              <Text style={styles.bucketBadgeText}>Recurring</Text>
                            </View>
                          ) : null}
                          <View
                            style={[
                              styles.categoryTone,
                                  summary.tone === 'good'
                                    ? styles.categoryToneGood
                                    : summary.tone === 'warning'
                                      ? styles.categoryToneWarning
                                      : styles.categoryToneAlert,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.categoryToneText,
                                    summary.tone === 'good'
                                      ? styles.categoryToneTextGood
                                      : summary.tone === 'warning'
                                        ? styles.categoryToneTextWarning
                                        : styles.categoryToneTextAlert,
                                  ]}
                                >
                                  {summary.tone === 'good'
                                    ? 'Healthy pace'
                                    : summary.tone === 'warning'
                                      ? 'Close to limit'
                                      : 'Over budget'}
                                </Text>
                              </View>
                              <View style={[styles.bucketBadge, styles.categoryAmountBadge]}>
                                <Text style={[styles.bucketBadgeText, styles.categoryAmountBadgeText]}>
                                  Left {formatCurrency(summary.left)}
                                </Text>
                              </View>
                            </View>
                            {summary.category.subcategories.length > 0 ? (
                              <View style={styles.categorySubcategoryRow}>
                                {summary.category.subcategories.map((subCategory) => (
                                  <View key={`${summary.category.id}-${subCategory}`} style={styles.subcategoryPill}>
                                    <Text style={styles.subcategoryPillText}>{subCategory}</Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                            {inlineSubcategoryCategoryId === summary.category.id ? (
                              <View style={styles.inlineSubcategoryEditor}>
                                <Text style={styles.fieldLabel}>Subcategories</Text>
                                <TextInput
                                  style={styles.inlineSubcategoryInput}
                                  value={inlineSubcategoryText}
                                  onChangeText={setInlineSubcategoryText}
                                  placeholder="Gym, Supplements, Memberships"
                                  placeholderTextColor={currentTheme.placeholder}
                                  selectionColor={currentTheme.accent}
                                />
                                <View style={styles.inlineActionRowCompact}>
                                  <Pressable
                                    style={styles.inlineButtonCompact}
                                    onPress={() => saveInlineSubcategories(summary.category.id)}
                                  >
                                    <Text style={styles.inlineButtonText}>Save subs</Text>
                                  </Pressable>
                                  <Pressable
                                    style={styles.inlineButtonCompact}
                                    onPress={closeInlineSubcategoryEditor}
                                  >
                                    <Text style={styles.inlineButtonText}>Cancel</Text>
                                  </Pressable>
                                </View>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={[styles.categoryTrack, { backgroundColor: theme.track }]}>
                        <View
                          style={[
                            styles.categoryFill,
                            { backgroundColor: theme.fill, width: `${Math.round(clamp(summary.ratio) * 100)}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.categoryMetrics}>
                        <View style={styles.categoryMetricBlock}>
                          <Text style={styles.categoryMetricLabel}>Spent</Text>
                          <Text style={styles.categoryMetricValue}>{formatCurrency(summary.spent)}</Text>
                        </View>

                        <View style={styles.categoryMetricBlock}>
                          <Text style={styles.categoryMetricLabel}>Planned</Text>
                          <Text style={styles.categoryMetricValue}>{formatCurrency(summary.category.planned)}</Text>
                        </View>
                      </View>

                      <View style={styles.inlineActionRowCompact}>
                        <Pressable
                          style={styles.inlineButtonCompact}
                          onPress={() =>
                            inlineSubcategoryCategoryId === summary.category.id
                              ? closeInlineSubcategoryEditor()
                              : openInlineSubcategoryEditor(summary.category)
                          }
                        >
                          <Text style={styles.inlineButtonText}>
                            {summary.category.subcategories.length > 0 ? 'Edit subs' : 'Add subs'}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.inlineButtonCompact}
                          onPress={() => duplicateCategoryDraft(summary.category)}
                        >
                          <Text style={styles.inlineButtonText}>Duplicate</Text>
                        </Pressable>
                        <Pressable
                          style={styles.inlineButtonCompact}
                          onPress={() => editCategory(summary.category)}
                        >
                          <Text style={styles.inlineButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.inlineButtonCompact, styles.inlineButtonDanger]}
                          onPress={() => deleteCategory(summary.category.id)}
                        >
                          <Text style={styles.inlineButtonDangerText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
                  : null}

                {showPlanCategoryList && categorySummaries.length > 3 ? (
                  <View style={styles.sectionActionRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => setShowAllPlanCategories((current) => !current)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {showAllPlanCategories
                          ? 'Show fewer categories'
                          : `Show all ${categorySummaries.length} categories`}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            {planSetupStep === 'review' ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>Review the setup</Text>
                    <Text style={styles.sectionSubtitle}>
                      Catch missing savings, oversized categories, and recurring weight before the month starts moving.
                    </Text>
                  </View>

                  <Pressable style={styles.secondaryButton} onPress={() => setPlanSetupStep('categories')}>
                    <Text style={styles.secondaryButtonText}>Keep editing</Text>
                  </Pressable>
                </View>

                {!isBudgetSetupReady ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>The setup still needs basics</Text>
                    <Text style={styles.emptyText}>
                      Add a monthly limit and at least one category before the review can show anything useful.
                    </Text>
                    <View style={styles.emptyActionRow}>
                      <Pressable style={styles.secondaryButton} onPress={() => setPlanSetupStep('limit')}>
                        <Text style={styles.secondaryButtonText}>Set limit</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryButton} onPress={() => setPlanSetupStep('categories')}>
                        <Text style={styles.secondaryButtonText}>Add categories</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.insightStatGrid}>
                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>Largest category</Text>
                        <Text style={styles.insightStatValue}>
                          {topPlannedCategory ? topPlannedCategory.name : 'None'}
                        </Text>
                        <Text style={styles.forecastStatMeta}>
                          {topPlannedCategory
                            ? formatCurrency(topPlannedCategory.planned)
                            : 'Add a category to compare lanes.'}
                        </Text>
                      </View>

                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>Recurring total</Text>
                        <Text style={styles.insightStatValue}>{formatCurrency(recurringPlanned)}</Text>
                        <Text style={styles.forecastStatMeta}>
                          {activeMonth.categories.filter((category) => category.recurring).length} recurring lanes
                        </Text>
                      </View>

                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>Savings bucket</Text>
                        <Text style={styles.insightStatValue}>
                          {formatCurrency(savingsBucketSummary?.planned ?? 0)}
                        </Text>
                        <Text style={styles.forecastStatMeta}>
                          {(savingsBucketSummary?.count ?? 0) > 0
                            ? `${savingsBucketSummary?.count ?? 0} savings lanes active`
                            : 'No savings lane yet'}
                        </Text>
                      </View>

                      <View style={styles.insightStatCard}>
                        <Text style={styles.insightStatLabel}>Finish state</Text>
                        <Text style={styles.insightStatValue}>
                          {allocationDifference === 0
                            ? 'Balanced'
                            : allocationDifference > 0
                              ? 'Still assigning'
                              : 'Needs trim'}
                        </Text>
                        <Text style={styles.forecastStatMeta}>{budgetSetupSummary}</Text>
                      </View>
                    </View>

                    <Text style={styles.fieldLabel}>Bucket balance</Text>
                    <View style={styles.insightBarList}>
                      {bucketSummaries.map((summary) => {
                        const progress = monthlyLimitNumber > 0 ? summary.planned / monthlyLimitNumber : 0;
                        const deltaText =
                          monthlyLimitNumber <= 0
                            ? 'Set a limit to compare against a target.'
                            : summary.difference >= 0
                              ? `${formatCurrency(summary.difference)} above guide`
                              : `${formatCurrency(Math.abs(summary.difference))} below guide`;

                        return (
                          <View key={summary.bucket} style={styles.insightBarRow}>
                            <View style={styles.insightBarHeader}>
                              <Text style={styles.insightBarLabel}>
                                {categoryBucketMeta[summary.bucket].label}
                              </Text>
                              <Text style={styles.insightBarMeta}>
                                {formatCurrency(summary.planned)}
                                {monthlyLimitNumber > 0 ? ` / ${formatCurrency(summary.target)}` : ''}
                              </Text>
                            </View>
                            <View style={styles.insightBarTrack}>
                              <View
                                style={[
                                  styles.insightBarFill,
                                  { width: `${Math.round(clamp(progress) * 100)}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.forecastStatMeta}>{deltaText}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {isBudgetSetupComplete ? (
                      <View style={styles.planFinishCard}>
                        <Text style={styles.planFinishTitle}>Budget is ready</Text>
                        <Text style={styles.planFinishText}>{budgetSetupSummary}</Text>
                        <View style={styles.compactHighlightRow}>
                          {completedSetupHighlights.map((item) => (
                            <View key={item} style={styles.compactHighlightChip}>
                              <Text style={styles.compactHighlightText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.actionRow}>
                          <Pressable style={styles.primaryButton} onPress={() => setActiveScreen('home')}>
                            <Text style={styles.primaryButtonText}>View current budget</Text>
                          </Pressable>
                          <Pressable style={styles.ghostButton} onPress={() => setActiveScreen('spend')}>
                            <Text style={styles.ghostButtonText}>Add first expense</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.suggestionList}>
                          {setupReviewItems.map((item, index) => (
                            <View key={`${item.title}-${index}`} style={styles.suggestionCard}>
                              <View
                                style={[
                                  styles.suggestionBadge,
                                  item.tone === 'alert'
                                    ? styles.planReviewBadgeAlert
                                    : item.tone === 'warning'
                                      ? styles.planReviewBadgeWarning
                                      : styles.planReviewBadgeGood,
                                ]}
                              >
                                <Text style={styles.suggestionBadgeText}>
                                  {item.tone === 'good' ? '✓' : item.tone === 'warning' ? '!' : '×'}
                                </Text>
                              </View>

                              <View style={styles.reviewCopy}>
                                <Text style={styles.reviewTitle}>{item.title}</Text>
                                <Text style={styles.suggestionText}>{item.body}</Text>
                              </View>
                            </View>
                          ))}
                        </View>

                        <View style={styles.planFinishCard}>
                          <Text style={styles.planFinishTitle}>Finish setup</Text>
                          <Text style={styles.planFinishText}>{budgetSetupSummary}</Text>
                          <View style={styles.actionRow}>
                            <Pressable style={styles.primaryButton} onPress={() => setActiveScreen('home')}>
                              <Text style={styles.primaryButtonText}>View current budget</Text>
                            </Pressable>
                            <Pressable style={styles.ghostButton} onPress={() => setActiveScreen('spend')}>
                              <Text style={styles.ghostButtonText}>Add first expense</Text>
                            </Pressable>
                          </View>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            ) : null}

            {planSetupStep === 'review' || appState.goals.length > 0 || editingGoalId ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Savings goals</Text>
                <Text style={styles.sectionSubtitle}>
                  Add a positive target so the budget is not only about cutting spend.
                </Text>

                {appState.goals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No goals yet</Text>
                    <Text style={styles.emptyText}>
                      Add a savings target so the plan tracks progress toward something positive too.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.goalList}>
                  {appState.goals.map((goal) => {
                    const theme = categoryThemes[goal.themeId];
                    const progress = goal.target > 0 ? goal.saved / goal.target : 0;

                    return (
                      <View
                        key={goal.id}
                        style={[styles.goalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      >
                        <View style={styles.goalHeader}>
                          <View>
                            <Text style={styles.goalName}>{goal.name}</Text>
                            <Text style={styles.goalMeta}>
                              {formatCurrency(goal.saved)} of {formatCurrency(goal.target)}
                            </Text>
                          </View>

                          <Text style={styles.goalProgress}>{Math.round(clamp(progress) * 100)}%</Text>
                        </View>

                        <View style={[styles.goalTrack, { backgroundColor: theme.track }]}>
                          <View
                            style={[
                              styles.goalFill,
                              { backgroundColor: theme.fill, width: `${Math.round(clamp(progress) * 100)}%` },
                            ]}
                          />
                        </View>

                        <View style={styles.inlineActionRow}>
                          <Pressable style={styles.inlineButton} onPress={() => editGoal(goal)}>
                            <Text style={styles.inlineButtonText}>Edit</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.inlineButton, styles.inlineButtonDanger]}
                            onPress={() => deleteGoal(goal.id)}
                          >
                            <Text style={styles.inlineButtonDangerText}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.formDivider} />
                <Text style={styles.sectionTitle}>{editingGoalId ? 'Edit goal' : 'Add goal'}</Text>

                <View style={styles.formShell}>
                  <View style={[styles.fieldCard, styles.fieldWide]}>
                    <Text style={styles.fieldLabel}>Goal</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={goalName}
                      onChangeText={setGoalName}
                      placeholder="New laptop"
                      placeholderTextColor={currentTheme.placeholder}
                      selectionColor={currentTheme.accent}
                    />
                  </View>

                  <View style={styles.fieldCard}>
                    <Text style={styles.fieldLabel}>Target</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={goalTarget}
                      onChangeText={setGoalTarget}
                      keyboardType="numeric"
                      placeholder="1200"
                      placeholderTextColor={currentTheme.placeholder}
                      selectionColor={currentTheme.accent}
                    />
                  </View>
                </View>

                <View style={styles.formShell}>
                  <View style={styles.fieldCard}>
                    <Text style={styles.fieldLabel}>Saved</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={goalSaved}
                      onChangeText={setGoalSaved}
                      keyboardType="numeric"
                      placeholder="200"
                      placeholderTextColor={currentTheme.placeholder}
                      selectionColor={currentTheme.accent}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Theme</Text>
                <View style={styles.chipWrap}>
                  {themeCycle.map((themeId) => {
                    const theme = categoryThemes[themeId];

                    return (
                      <Pressable
                        key={`goal-${themeId}`}
                        style={[
                          styles.selectionChip,
                          { backgroundColor: theme.chip },
                          goalThemeId === themeId && styles.selectionChipActive,
                        ]}
                        onPress={() => setGoalThemeId(themeId)}
                      >
                        <Text
                          style={[
                            styles.selectionChipText,
                            { color: theme.chipText },
                            goalThemeId === themeId && styles.selectionChipTextActive,
                          ]}
                        >
                          {themeId}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.primaryButton} onPress={submitGoal}>
                    <Text style={styles.primaryButtonText}>
                      {editingGoalId ? 'Update goal' : 'Add goal'}
                    </Text>
                  </Pressable>

                  {editingGoalId ? (
                    <Pressable style={styles.ghostButton} onPress={resetGoalForm}>
                      <Text style={styles.ghostButtonText}>Cancel edit</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {activeScreen === 'insights' ? (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Month history</Text>
                  <Text style={styles.sectionSubtitle}>
                    Browse saved months, switch the active budget, or roll the plan forward.
                  </Text>
                </View>

                <Pressable style={styles.tertiaryButton} onPress={rollToNextMonth}>
                  <Text style={styles.tertiaryButtonText}>+ Next month</Text>
                </Pressable>
              </View>

              <View style={styles.monthRow}>
                {sortedMonths.map((month) => (
                  <Pressable
                    key={month.id}
                    style={[
                      styles.monthPill,
                      month.id === activeMonth.id && styles.monthPillActive,
                    ]}
                    onPress={() => selectMonth(month.id)}
                  >
                    <Text
                      style={[
                        styles.monthPillText,
                        month.id === activeMonth.id && styles.monthPillTextActive,
                      ]}
                    >
                      {getMonthLabel(month.id, localeTag)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {hasActiveBudget ? (
                <View style={styles.sectionActionRow}>
                  <Pressable style={styles.tertiaryButton} onPress={copyActiveBudgetToNewMonth}>
                    <Text style={styles.tertiaryButtonText}>Copy this budget</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.trendCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Forecast and alerts</Text>
                  <Text style={styles.sectionSubtitle}>
                    Use the deeper pace, forecast, and risk view here instead of crowding the main budget screen.
                  </Text>
                </View>
                <View style={styles.deltaChip}>
                  <Text style={styles.deltaChipText}>{forecastChipLabel}</Text>
                </View>
              </View>

              <View style={styles.alertList}>
                {alerts.map((alert, index) => (
                  <View
                    key={`${alert.title}-${index}`}
                    style={[
                      styles.alertCard,
                      alert.tone === 'good'
                        ? styles.alertCardGood
                        : alert.tone === 'warning'
                          ? styles.alertCardWarning
                          : styles.alertCardAlert,
                    ]}
                  >
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertBody}>{alert.body}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.insightStatGrid}>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Pace vs target</Text>
                  <Text style={styles.insightStatValue}>{paceLineLabel}</Text>
                  <Text style={styles.forecastStatMeta}>{paceLineMeta}</Text>
                </View>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Safe per day</Text>
                  <Text style={styles.insightStatValue}>{safeDailyLabel}</Text>
                  <Text style={styles.forecastStatMeta}>{safeDailyMeta}</Text>
                </View>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Runway</Text>
                  <Text style={styles.insightStatValue}>{runwayLabel}</Text>
                  <Text style={styles.forecastStatMeta}>{runwayMeta}</Text>
                </View>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Pressure point</Text>
                  <Text style={styles.insightStatValue}>{riskLabel}</Text>
                  <Text style={styles.forecastStatMeta}>{riskMeta}</Text>
                </View>
              </View>

              <View style={styles.trendSummaryRow}>
                <View>
                  <Text style={styles.trendKicker}>Biggest risk</Text>
                  <Text style={styles.trendValueSmall}>{riskLabel}</Text>
                </View>

                <View>
                  <Text style={styles.trendKicker}>Forecast confidence</Text>
                  <Text style={styles.trendValueSmall}>{forecastSnapshot.confidenceLabel}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Weekly spend pace</Text>
              <Text style={styles.sectionSubtitle}>{weeklyInsightSubtitle}</Text>

              <View style={styles.weeklyInsightStrip}>
                {weeklyInsightRows.map((row) => {
                  const fillHeight: DimensionValue =
                    row.total > 0
                      ? `${Math.max(10, Math.round(clamp(row.total / weeklyInsightMax) * 100))}%`
                      : '0%';
                  const totalForMix = Math.max(row.total, 1);

                  return (
                    <View key={row.label} style={styles.weeklyInsightMiniCard}>
                      <Text style={styles.weeklyInsightMiniLabel}>
                        {isNarrow ? row.shortLabel : row.label}
                      </Text>
                      <View
                        style={[
                          styles.weeklyInsightMiniState,
                          row.state === 'upcoming'
                            ? styles.weeklyInsightStateUpcoming
                            : row.state === 'current'
                              ? styles.weeklyInsightStateCurrent
                              : styles.weeklyInsightStateDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.weeklyInsightMiniStateText,
                            row.state === 'upcoming'
                              ? styles.weeklyInsightStateTextUpcoming
                              : row.state === 'current'
                                ? styles.weeklyInsightStateTextCurrent
                                : styles.weeklyInsightStateTextDone,
                          ]}
                        >
                          {row.state === 'upcoming'
                            ? 'Next'
                            : row.state === 'current'
                              ? 'Now'
                              : 'Done'}
                        </Text>
                      </View>

                      <View style={styles.weeklyInsightMiniTrack}>
                        <View style={styles.weeklyInsightMiniAxis} />
                        {row.total > 0 ? (
                          <View style={[styles.weeklyInsightMiniFill, { height: fillHeight }]}>
                            {row.fixed > 0 ? (
                              <View
                                style={[
                                  styles.weeklyInsightMiniFixed,
                                  { flex: row.fixed / totalForMix },
                                ]}
                              />
                            ) : null}
                            {row.flexible > 0 ? (
                              <View
                                style={[
                                  styles.weeklyInsightMiniFlexible,
                                  { flex: row.flexible / totalForMix },
                                ]}
                              />
                            ) : null}
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.weeklyInsightMiniAmount}>
                        {formatCompactCurrency(row.total)}
                      </Text>
                      <Text style={styles.weeklyInsightMiniMeta}>
                        {row.total > 0
                          ? row.flexible > 0
                            ? `Fixed ${formatCompactCurrency(row.fixed)} · Flex ${formatCompactCurrency(row.flexible)}`
                            : `Fixed ${formatCompactCurrency(row.fixed)}`
                          : row.state === 'upcoming'
                            ? 'Not started'
                            : 'No spend'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Long-range view</Text>
              <Text style={styles.sectionSubtitle}>{longRangeSubtitle}</Text>

              <View style={styles.filterRow}>
                {(['quarter', 'half', 'year'] as InsightWindow[]).map((windowKey) => (
                  <Pressable
                    key={windowKey}
                    style={[
                      styles.filterChip,
                      insightWindow === windowKey && styles.filterChipActive,
                    ]}
                    onPress={() => setInsightWindow(windowKey)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        insightWindow === windowKey && styles.filterChipTextActive,
                      ]}
                    >
                      {insightWindowMeta[windowKey].label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.filterRow}>
                {(
                  [
                    { value: 'all', label: 'All spend' },
                    { value: 'adjustable', label: 'Adjustable only' },
                  ] as Array<{ value: InsightSpendMode; label: string }>
                ).map((mode) => (
                  <Pressable
                    key={mode.value}
                    style={[styles.filterChip, insightSpendMode === mode.value && styles.filterChipActive]}
                    onPress={() => setInsightSpendMode(mode.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        insightSpendMode === mode.value && styles.filterChipTextActive,
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.insightStatGrid}>
                {insightSummary.isMixedCurrency ? (
                  <>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>Tracked months</Text>
                      <Text style={styles.insightStatValue}>{insightSummary.months.length}</Text>
                      <Text style={styles.forecastStatMeta}>{insightWindowCoverageText}</Text>
                    </View>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>Currencies</Text>
                      <Text style={styles.insightStatValue}>{insightCurrencySummaryLabel}</Text>
                      <Text style={styles.forecastStatMeta}>Month values stay in their own currency</Text>
                    </View>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>Avg plan used</Text>
                      <Text style={styles.insightStatValue}>
                        {Math.round(insightSummary.averagePlanUsageRatio * 100)}%
                      </Text>
                      <Text style={styles.forecastStatMeta}>Usage ratio across recorded months</Text>
                    </View>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>Over plan months</Text>
                      <Text style={styles.insightStatValue}>
                        {insightSummary.overBudgetMonths}/{insightSummary.months.length || 0}
                      </Text>
                      <Text style={styles.forecastStatMeta}>Months above target</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>
                        {insightSpendMode === 'adjustable' ? 'Adjustable spend' : 'Window spend'}
                      </Text>
                      <Text style={styles.insightStatValue}>{formatCurrency(insightDisplayedTotal)}</Text>
                      <Text style={styles.forecastStatMeta}>{insightWindowCoverageText}</Text>
                    </View>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>
                        {insightSpendMode === 'adjustable' ? 'Adjustable / month' : 'Average / month'}
                      </Text>
                      <Text style={styles.insightStatValue}>
                        {formatCurrency(insightDisplayedAverageMonthly)}
                      </Text>
                      <Text style={styles.forecastStatMeta}>
                        {insightSpendMode === 'adjustable' ? 'Flexible average' : 'All spend average'}
                      </Text>
                    </View>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>Fixed / month</Text>
                      <Text style={styles.insightStatValue}>
                        {formatCurrency(insightSummary.averageMonthlyFixedSpend)}
                      </Text>
                      <Text style={styles.forecastStatMeta}>Recurring baseline</Text>
                    </View>
                    <View style={styles.insightStatCard}>
                      <Text style={styles.insightStatLabel}>Over plan months</Text>
                      <Text style={styles.insightStatValue}>
                        {insightSummary.overBudgetMonths}/{insightSummary.months.length || 0}
                      </Text>
                      <Text style={styles.forecastStatMeta}>Months above target</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Spend mix over time</Text>
              <Text style={styles.sectionSubtitle}>{insightRangeSubtitle}</Text>
              {insightSpendMode === 'all' ? (
                <View style={styles.insightLegendRow}>
                  <View style={styles.insightLegendItem}>
                    <View style={[styles.insightLegendSwatch, styles.insightLegendSwatchFixed]} />
                    <Text style={styles.insightLegendText}>Fixed recurring</Text>
                  </View>
                  <View style={styles.insightLegendItem}>
                    <View style={[styles.insightLegendSwatch, styles.insightLegendSwatchFlexible]} />
                    <Text style={styles.insightLegendText}>Flexible spend</Text>
                  </View>
                </View>
              ) : null}

              {insightSummary.months.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No history yet</Text>
                  <Text style={styles.emptyText}>
                    Import your monthly PDFs or keep logging budgets to build quarter and yearly insights.
                  </Text>
                </View>
              ) : (
                <View style={styles.insightBarList}>
                  {insightDisplayedMonths.map((month) => {
                    const width = Math.round(
                      clamp(
                        month.planned > 0
                          ? month.displaySpent / month.planned
                          : month.displaySpent > 0
                            ? 1
                            : 0,
                      ) * 100,
                    );
                    const stackedWidth: DimensionValue = `${width}%`;
                    const totalForMix = Math.max(month.spent, 1);

                    return (
                      <View key={month.id} style={styles.insightBarRow}>
                        <View style={styles.insightBarHeader}>
                          <Text style={styles.insightBarLabel}>{month.label}</Text>
                          <Text style={styles.insightBarMeta}>
                            {formatMonthCurrency(
                              month,
                              insightSpendMode === 'adjustable' ? month.flexibleSpent : month.spent,
                            )}{' '}
                            / {formatMonthCurrency(month, month.planned)}
                          </Text>
                        </View>
                        {insightSpendMode === 'adjustable' ? (
                          <View style={styles.insightBarTrack}>
                            <View style={[styles.insightBarFill, { width: stackedWidth }]} />
                          </View>
                        ) : (
                          <View style={styles.stackedInsightTrack}>
                            <View style={[styles.stackedInsightFill, { width: stackedWidth }]}>
                              {month.fixedSpent > 0 ? (
                                <View
                                  style={[
                                    styles.stackedInsightFixed,
                                    { flex: month.fixedSpent / totalForMix },
                                  ]}
                                />
                              ) : null}
                              {month.flexibleSpent > 0 ? (
                                <View
                                  style={[
                                    styles.stackedInsightFlexible,
                                    { flex: month.flexibleSpent / totalForMix },
                                  ]}
                                />
                              ) : null}
                            </View>
                          </View>
                        )}
                        <Text style={styles.forecastStatMeta}>
                          {insightSpendMode === 'adjustable'
                            ? `Adjustable ${formatMonthCurrency(month, month.flexibleSpent)} • Fixed baseline ${formatMonthCurrency(month, month.fixedSpent)}`
                            : `Fixed ${formatMonthCurrency(month, month.fixedSpent)} • Flexible ${formatMonthCurrency(month, month.flexibleSpent)}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Smart suggestions</Text>
              <Text style={styles.sectionSubtitle}>
                Actionable notes for flexible spend. Fixed recurring costs are treated separately.
              </Text>

              <View style={styles.suggestionList}>
                {insightSuggestions.map((suggestion, index) => (
                  <View key={`${suggestion.title}-${index}`} style={styles.suggestionCard}>
                    <View
                      style={[
                        styles.suggestionBadge,
                        suggestion.tone === 'alert'
                          ? styles.planReviewBadgeAlert
                          : suggestion.tone === 'warning'
                            ? styles.planReviewBadgeWarning
                            : styles.planReviewBadgeGood,
                      ]}
                    >
                      <Text style={styles.suggestionBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.reviewCopy}>
                      <Text style={styles.reviewTitle}>{suggestion.title}</Text>
                      <Text style={styles.suggestionText}>{suggestion.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>AI monthly review</Text>
                  <Text style={styles.sectionSubtitle}>
                    Server-side Gemini review using monthly aggregates only. No raw notes are sent.
                  </Text>
                </View>

                <Pressable
                  style={styles.tertiaryButton}
                  onPress={generateAiMonthlyReview}
                  disabled={aiReviewBusy}
                >
                  <Text style={styles.tertiaryButtonText}>
                    {aiReviewBusy
                      ? 'Generating...'
                      : activeAiReview
                        ? 'Refresh review'
                        : 'Generate review'}
                  </Text>
                </Pressable>
              </View>

              {activeAiReview ? (
                <>
                  <View style={styles.aiReviewMetaRow}>
                    <View style={styles.deltaChip}>
                      <Text style={styles.deltaChipText}>{activeAiReview.model}</Text>
                    </View>
                    <Text style={styles.forecastStatMeta}>Updated {aiReviewGeneratedLabel}</Text>
                  </View>

                  <View style={styles.aiReviewSummaryCard}>
                    <Text style={styles.reviewTitle}>{activeAiReview.headline}</Text>
                    <Text style={styles.aiReviewSummaryText}>{activeAiReview.summary}</Text>
                  </View>

                  <View style={styles.aiReviewWatchout}>
                    <Text style={styles.fieldLabel}>Watchout</Text>
                    <Text style={styles.suggestionText}>{activeAiReview.watchout}</Text>
                  </View>

                  <View style={styles.aiReviewActionList}>
                    {activeAiReview.actions.map((action, index) => (
                      <View key={`${action}-${index}`} style={styles.aiReviewActionRow}>
                        <View style={styles.aiReviewActionIndex}>
                          <Text style={styles.suggestionBadgeText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.aiReviewActionText}>{action}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.emptyStateCompact}>
                  <Text style={styles.emptyTitle}>No AI review yet</Text>
                  <Text style={styles.emptyText}>
                    Generate one concise monthly review when you want a second opinion on how to improve the budget.
                  </Text>
                </View>
              )}

              {activeAiReviewError ? (
                <Text style={styles.aiReviewErrorText}>{activeAiReviewError}</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {activeScreen === 'settings' ? renderSettingsScreen() : null}
      </ScrollView>
      <Modal
        animationType="slide"
        transparent
        visible={isExpenseSheetOpen}
        onRequestClose={resetTransactionForm}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismissArea} onPress={resetTransactionForm} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetTitle}>
                  {editingTransactionId ? 'Edit expense' : 'Add expense'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  Keep the entry simple now. You can refine it later from the activity list.
                </Text>
              </View>
              <Pressable style={styles.secondaryButton} onPress={resetTransactionForm}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderExpenseForm()}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(selectedCategorySummary)}
        onRequestClose={closeCategoryDetail}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismissArea} onPress={closeCategoryDetail} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetTitle}>
                  {selectedCategorySummary?.category.name ?? 'Category'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedCategorySummary
                    ? `${formatCurrency(selectedCategorySummary.spent)} spent of ${formatCurrency(
                        selectedCategorySummary.category.planned,
                      )} planned.`
                    : 'Review this category and log the next expense from here.'}
                </Text>
              </View>
              <Pressable style={styles.secondaryButton} onPress={closeCategoryDetail}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
            </View>

            {selectedCategorySummary && selectedCategoryDetail ? (
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.categoryDetailCard}>
                  <View style={styles.categoryDetailStats}>
                    <View style={styles.categoryDetailStat}>
                      <Text style={styles.categoryDetailStatLabel}>Left</Text>
                      <Text
                        style={[
                          styles.categoryDetailStatValue,
                          selectedCategorySummary.left < 0 && styles.currentBudgetAmountAlert,
                        ]}
                      >
                        {formatCurrency(selectedCategorySummary.left)}
                      </Text>
                    </View>
                    <View style={styles.categoryDetailStat}>
                      <Text style={styles.categoryDetailStatLabel}>This week</Text>
                      <Text style={styles.categoryDetailStatValue}>
                        {formatCurrency(selectedCategorySummary.thisWeek)}
                      </Text>
                    </View>
                    <View style={styles.categoryDetailStat}>
                      <Text style={styles.categoryDetailStatLabel}>Type</Text>
                      <Text style={styles.categoryDetailStatValue}>
                        {selectedCategoryDetail.recurring ? 'Fixed' : 'Flexible'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.currentBudgetTrack,
                      { backgroundColor: categoryThemes[selectedCategoryDetail.themeId].track },
                    ]}
                  >
                    <View
                      style={[
                        styles.currentBudgetFill,
                        {
                          backgroundColor: categoryThemes[selectedCategoryDetail.themeId].fill,
                          width: `${Math.round(clamp(selectedCategorySummary.ratio) * 100)}%`,
                        },
                      ]}
                    />
                  </View>

                  {selectedCategoryDetail.subcategories.length > 0 ? (
                    <>
                      <Text style={styles.fieldLabel}>Subcategories</Text>
                      <View style={styles.chipWrap}>
                        {selectedCategoryDetail.subcategories.map((subcategory) => (
                          <View key={subcategory} style={styles.subcategoryPill}>
                            <Text style={styles.subcategoryPillText}>{subcategory}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => {
                        const nextCategoryId = selectedCategoryDetail.id;
                        closeCategoryDetail();
                        openExpenseCapture(nextCategoryId, null);
                      }}
                    >
                      <Text style={styles.primaryButtonText}>Add expense</Text>
                    </Pressable>
                    <Pressable
                      style={styles.ghostButton}
                      onPress={() => {
                        const nextCategory = selectedCategoryDetail;
                        closeCategoryDetail();
                        editCategory(nextCategory);
                      }}
                    >
                      <Text style={styles.ghostButtonText}>Edit category</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Recent expenses</Text>
                  {selectedCategoryTransactions.length > 0 ? (
                    <View style={styles.categoryDetailTransactionList}>
                      {selectedCategoryTransactions.map((transaction) => (
                        <View key={transaction.id} style={styles.categoryDetailTransactionRow}>
                          <View style={styles.categoryDetailTransactionCopy}>
                            <Text style={styles.categoryDetailTransactionTitle}>
                              {transaction.note.trim() || selectedCategoryDetail.name}
                            </Text>
                            <Text style={styles.categoryDetailTransactionMeta}>
                              {formatTransactionDate(transaction.happenedAt, localeTag)}
                            </Text>
                          </View>
                          <Text style={styles.categoryDetailTransactionAmount}>
                            {formatCurrency(transaction.amount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyStateCompact}>
                      <Text style={styles.selectorHint}>
                        No expenses have been logged in this category yet.
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={isThemeSheetOpen}
        onRequestClose={closeThemePicker}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismissArea} onPress={closeThemePicker} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetTitle}>Choose theme</Text>
                <Text style={styles.sheetSubtitle}>
                  Keep the app look calm without filling the Settings screen with preview cards.
                </Text>
              </View>
              <Pressable style={styles.secondaryButton} onPress={closeThemePicker}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.themeGrid}>
                {appThemeOrder.map((themeId) => {
                  const themeOption = appThemes[themeId];
                  const selected = appState.preferences.appThemeId === themeId;

                  return (
                    <Pressable
                      key={themeId}
                      style={[
                        styles.themeCard,
                        {
                          backgroundColor: themeOption.surfaceSoft,
                          borderColor: selected ? currentTheme.accentBorder : themeOption.divider,
                        },
                        selected && styles.themeCardActive,
                      ]}
                      onPress={() => updateAppTheme(themeId)}
                    >
                      <View style={styles.themePreviewRow}>
                        <View style={[styles.themeHeroSwatch, { backgroundColor: themeOption.hero }]} />
                        <View style={[styles.themeAccentSwatch, { backgroundColor: themeOption.accent }]} />
                        <View style={[styles.themeAccentSwatch, { backgroundColor: themeOption.orbPrimary }]} />
                      </View>
                      <Text style={[styles.themeName, { color: themeOption.text }]}>{themeOption.name}</Text>
                      <Text style={[styles.themeMeta, { color: themeOption.textMuted }]}>
                        {themeOption.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={isAccountSheetOpen}
        onRequestClose={closeAccountSheet}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismissArea} onPress={closeAccountSheet} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetTitle}>
                  {editingAccountId ? 'Edit bank account' : 'Add bank account'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  Tag one account with multiple roles if you use it for spending, pockets, and savings at the same time.
                </Text>
              </View>
              <Pressable style={styles.secondaryButton} onPress={closeAccountSheet}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderBankAccountForm()}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <View style={styles.bottomNav}>
        {screenTabs.map((screenId) => (
          <Pressable
            key={screenId}
            style={[
              styles.bottomNavItem,
              activeScreen === screenId && styles.bottomNavItemActive,
            ]}
            onPress={() => {
              if (screenId === 'plan') {
                openPlanCategories();
                return;
              }

              setActiveScreen(screenId);
            }}
          >
            <Text
              style={[
                styles.bottomNavIcon,
                activeScreen === screenId && styles.bottomNavIconActive,
              ]}
            >
              {screenMeta[screenId].navIcon}
            </Text>
            <Text
              style={[
                styles.bottomNavText,
                activeScreen === screenId && styles.bottomNavTextActive,
              ]}
            >
              {screenMeta[screenId].label}
            </Text>
          </Pressable>
        ))}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const createStyles = (
  theme: AppTheme,
  { isCompact, isNarrow }: { isCompact: boolean; isNarrow: boolean },
) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 40,
      textAlign: 'center',
      color: theme.textSoft,
      fontSize: 16,
    },
    backgroundLayer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    scroll: {
      flex: 1,
    },
    orb: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.82,
    },
    orbPrimary: {
      width: 260,
      height: 260,
      backgroundColor: theme.orbPrimary,
      top: -50,
      right: -70,
    },
    orbSoft: {
      width: 220,
      height: 220,
      backgroundColor: theme.orbSecondary,
      top: 320,
      left: -90,
    },
    orbWarm: {
      width: 180,
      height: 180,
      backgroundColor: theme.orbTertiary,
      bottom: 40,
      right: -60,
    },
    content: {
      paddingHorizontal: isCompact ? 14 : 18,
      paddingTop: 6,
      paddingBottom: 96,
    },
    screenHeader: {
      paddingHorizontal: 2,
      paddingTop: 6,
      paddingBottom: 12,
    },
    screenHeaderTitle: {
      fontSize: isCompact ? 22 : 24,
      lineHeight: isCompact ? 27 : 30,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 6,
    },
    screenHeaderSubtitle: {
      fontSize: 12,
      lineHeight: 18,
      color: theme.textMuted,
      maxWidth: 360,
    },
    heroCard: {
      backgroundColor: theme.hero,
      borderRadius: 26,
      padding: isCompact ? 16 : 18,
      marginBottom: 12,
      shadowColor: theme.heroShadow,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    heroTopRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    monthChip: {
      backgroundColor: theme.heroChip,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    monthChipText: {
      color: theme.heroChipText,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    statusPillGood: {
      backgroundColor: theme.heroStatusGood,
    },
    statusPillAlert: {
      backgroundColor: theme.heroStatusAlert,
    },
    statusPillText: {
      fontSize: 12,
      fontWeight: '700',
    },
    statusPillTextGood: {
      color: theme.heroStatusGoodText,
    },
    statusPillTextAlert: {
      color: theme.heroStatusAlertText,
    },
    heroTitle: {
      fontSize: isCompact ? 24 : 28,
      lineHeight: isCompact ? 29 : 32,
      fontWeight: '800',
      color: theme.heroText,
      marginBottom: 6,
    },
    heroSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.heroMuted,
      maxWidth: isCompact ? undefined : 320,
      marginBottom: 4,
    },
    storageCaption: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 12,
    },
    storageCaptionGood: {
      color: theme.heroChipText,
    },
    storageCaptionWarning: {
      color: theme.heroMuted,
    },
    storageCaptionError: {
      color: '#FFD0C8',
    },
    limitPanel: {
      backgroundColor: theme.heroPanel,
      borderRadius: 20,
      padding: 14,
      marginBottom: 10,
    },
    limitLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.accentText,
      marginBottom: 8,
    },
    limitInputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.heroPanelSoft,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    limitPrefix: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      marginRight: 6,
    },
    limitInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      paddingVertical: 6,
    },
    progressTrack: {
      height: 10,
      backgroundColor: theme.progressTrack,
      borderRadius: 999,
      marginTop: 16,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    progressFillGood: {
      backgroundColor: theme.progressGood,
    },
    progressFillWarning: {
      backgroundColor: theme.progressWarning,
    },
    progressFillAlert: {
      backgroundColor: theme.progressAlert,
    },
    progressLabels: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 10,
      gap: 10,
    },
    progressCaption: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    metricRow: {
      flexDirection: 'row',
      gap: 8,
    },
    metricTile: {
      flexBasis: isCompact ? '31%' : 0,
      flexGrow: 1,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    metricTileLabel: {
      color: theme.heroMuted,
      fontSize: 11,
      marginBottom: 4,
    },
    metricTileValue: {
      color: theme.heroText,
      fontWeight: '800',
      fontSize: isNarrow ? 14 : 16,
    },
    metricTileValueGood: {
      color: theme.heroText,
    },
    metricTileValueAlert: {
      color: '#FFDCD2',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 14,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOpacity: 0.03,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 1,
    },
    trendCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 14,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOpacity: 0.03,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 1,
    },
    sectionHeader: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: isCompact ? 'stretch' : 'flex-start',
      marginBottom: 12,
    },
    sectionHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },
    headerActionStack: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    planStepRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    planCompactStatusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    planCompactStatusPill: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.divider,
      flexBasis: isCompact ? '48%' : 0,
      flexGrow: 1,
    },
    planCompactStatusPillNeutral: {
      backgroundColor: theme.surfaceMuted,
    },
    planCompactStatusPillGood: {
      backgroundColor: theme.successSurface,
      borderColor: theme.successSurface,
    },
    planCompactStatusPillAlert: {
      backgroundColor: theme.alertSurface,
      borderColor: theme.alertSurface,
    },
    planCompactStatusLabel: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 4,
    },
    planCompactStatusValue: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
    },
    planStepChip: {
      backgroundColor: theme.surfaceSoft,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    planStepChipActive: {
      backgroundColor: theme.accent,
    },
    planStepChipDone: {
      backgroundColor: theme.accentSoft,
      borderWidth: 1,
      borderColor: theme.accentBorder,
    },
    planStepChipText: {
      color: theme.textMuted,
      fontWeight: '800',
      fontSize: 11,
    },
    planStepChipTextActive: {
      color: theme.heroText,
    },
    planStepChipTextDone: {
      color: theme.accentText,
    },
    planSetupLead: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 4,
    },
    planSetupSummaryCard: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    planSetupSummaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    planSetupMetric: {
      flexBasis: isCompact ? '48%' : '24%',
      flexGrow: 1,
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 10,
    },
    planSetupMetricLabel: {
      color: theme.textMuted,
      fontSize: 10,
      marginBottom: 4,
    },
    planSetupMetricValue: {
      color: theme.text,
      fontWeight: '800',
      fontSize: 15,
    },
    planSetupMetricValueGood: {
      color: theme.successText,
    },
    planSetupMetricValueAlert: {
      color: theme.alertText,
    },
    sectionTitle: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '800',
      color: theme.text,
    },
    sectionSubtitle: {
      fontSize: 11,
      lineHeight: 17,
      color: theme.textMuted,
      marginTop: 4,
      maxWidth: isCompact ? undefined : 300,
    },
    secondaryButton: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    secondaryButtonText: {
      color: theme.accentText,
      fontSize: 10,
      fontWeight: '800',
      flexShrink: 1,
    },
    monthRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    monthPill: {
      backgroundColor: theme.surfaceSoft,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    monthPillActive: {
      backgroundColor: theme.accent,
    },
    monthPillText: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    monthPillTextActive: {
      color: theme.heroText,
    },
    deltaChip: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    deltaChipText: {
      color: theme.accentText,
      fontSize: 12,
      fontWeight: '700',
      flexShrink: 1,
    },
    alertList: {
      gap: 8,
      marginBottom: 12,
    },
    alertCard: {
      borderRadius: 16,
      padding: 12,
    },
    alertCardGood: {
      backgroundColor: theme.successSurface,
    },
    alertCardWarning: {
      backgroundColor: theme.warningSurface,
    },
    alertCardAlert: {
      backgroundColor: theme.alertSurface,
    },
    alertTitle: {
      color: theme.text,
      fontWeight: '800',
      marginBottom: 4,
    },
    alertBody: {
      color: theme.textSoft,
      lineHeight: 19,
    },
    trendSummaryRow: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isCompact ? 'flex-start' : 'flex-end',
      marginBottom: 14,
      gap: isCompact ? 12 : 0,
    },
    trendKicker: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 4,
    },
    trendValueSmall: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    chartRow: {
      flexDirection: 'row',
      flexWrap: isCompact ? 'wrap' : 'nowrap',
      gap: 10,
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    chartColumn: {
      flexBasis: isCompact ? '47%' : 0,
      flexGrow: 1,
      alignItems: 'center',
    },
    chartTrack: {
      width: '100%',
      height: 88,
      backgroundColor: theme.surfaceStrong,
      borderRadius: 16,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      paddingHorizontal: 6,
      paddingBottom: 6,
      marginBottom: 6,
    },
    chartBar: {
      width: '100%',
      borderRadius: 10,
      backgroundColor: theme.accent,
    },
    chartAmount: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },
    chartLabel: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 2,
    },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    themeCard: {
      width: isNarrow ? '100%' : '48%',
      borderRadius: 18,
      borderWidth: 1,
      padding: 10,
      gap: 6,
    },
    themeCardActive: {
      borderWidth: 2,
    },
    themePreviewRow: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    themeHeroSwatch: {
      flex: 1,
      height: 18,
      borderRadius: 9,
    },
    themeAccentSwatch: {
      width: 16,
      height: 16,
      borderRadius: 6,
    },
    themeName: {
      fontSize: 13,
      fontWeight: '800',
    },
    themeMeta: {
      fontSize: 9,
      lineHeight: 13,
    },
    settingsOverviewText: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
    },
    settingsSectionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    settingsSectionChip: {
      backgroundColor: theme.surfaceSoft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.surfaceSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    settingsSectionChipActive: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accentBorder,
    },
    settingsSectionChipText: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    settingsSectionChipTextActive: {
      color: theme.accentText,
    },
    accountBanner: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      marginBottom: 14,
    },
    accountCopy: {
      gap: 5,
    },
    accountTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
    },
    accountMeta: {
      color: theme.textMuted,
      lineHeight: 19,
    },
    bankAccountList: {
      gap: 10,
      marginTop: 14,
    },
    bankAccountRow: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 10,
      gap: 8,
    },
    bankAccountCopy: {
      gap: 4,
    },
    bankAccountMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    bankAccountTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '800',
    },
    bankAccountMeta: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    bankAccountUsage: {
      color: theme.accentText,
      fontSize: 11,
      fontWeight: '700',
    },
    authStatusText: {
      marginBottom: 14,
      lineHeight: 18,
      fontWeight: '600',
    },
    formShell: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: 10,
      marginTop: 10,
      marginBottom: 10,
    },
    fieldCard: {
      flex: 1,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
    },
    fieldWide: {
      flex: 1,
    },
    fieldLabel: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: '700',
      marginBottom: 4,
    },
    fieldInput: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      paddingVertical: 6,
    },
    fieldValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      paddingTop: 4,
      paddingBottom: 2,
    },
    fieldHint: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '600',
      paddingBottom: 6,
    },
    dateFieldCard: {
      minHeight: 84,
      justifyContent: 'center',
    },
    datePickerCard: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 22,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginBottom: 14,
      overflow: 'hidden',
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categorySuggestionBlock: {
      marginTop: 4,
      marginBottom: 6,
      gap: 8,
    },
    selectionChip: {
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    selectionChipActive: {
      borderWidth: 2,
      borderColor: theme.accentBorder,
    },
    selectionChipText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    selectionChipTextActive: {
      color: theme.text,
    },
    switchRow: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isCompact ? 'flex-start' : 'center',
      marginVertical: 14,
      gap: 12,
    },
    switchLabel: {
      flex: isCompact ? 0 : 1,
      color: theme.text,
      fontWeight: '700',
    },
    actionRow: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: 8,
      alignItems: isCompact ? 'stretch' : 'center',
      flexWrap: 'wrap',
    },
    toolbarRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      marginBottom: 10,
    },
    heroActionStack: {
      gap: 8,
      marginTop: 2,
    },
    heroPrimaryButton: {
      alignSelf: 'flex-start',
      minWidth: isCompact ? 160 : 176,
    },
    heroSecondaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    primaryButton: {
      backgroundColor: theme.accent,
      borderRadius: 15,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: theme.heroText,
      fontWeight: '800',
      fontSize: 13,
    },
    ghostButton: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: 15,
      paddingHorizontal: 14,
      paddingVertical: 9,
      alignItems: 'center',
    },
    ghostButtonText: {
      color: theme.accentText,
      fontWeight: '800',
      fontSize: 12,
    },
    tertiaryButton: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: 'center',
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    tertiaryButtonText: {
      color: theme.accentText,
      fontSize: 11,
      fontWeight: '800',
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(19, 16, 18, 0.18)',
      justifyContent: 'flex-end',
    },
    sheetDismissArea: {
      flex: 1,
    },
    sheetCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 18,
      maxHeight: '88%',
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -6 },
      elevation: 10,
    },
    sheetHandle: {
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.divider,
      alignSelf: 'center',
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
    },
    sheetHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },
    sheetTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    sheetSubtitle: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 17,
    },
    sheetScroll: {
      flexGrow: 0,
    },
    sheetContent: {
      paddingBottom: 14,
    },
    planLimitActionButton: {
      width: '100%',
      alignSelf: 'stretch',
    },
    budgetGuideList: {
      gap: 10,
      marginTop: 4,
      marginBottom: 4,
    },
    budgetGuideCard: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    budgetGuideHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 8,
    },
    budgetGuideLabel: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
      flex: 1,
    },
    budgetGuideChip: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.surfaceStrong,
    },
    budgetGuideChipText: {
      color: theme.accentText,
      fontSize: 10,
      fontWeight: '800',
    },
    budgetGuideValue: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
    budgetGuideMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },
    transferGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 16,
    },
    transferCard: {
      borderRadius: 20,
      padding: 14,
      minHeight: 118,
      borderWidth: 1,
      width: isNarrow ? '100%' : '48%',
    },
    transferCardPrimary: {
      backgroundColor: theme.accent,
      borderColor: theme.accentBorder,
    },
    transferCardSecondary: {
      backgroundColor: theme.surfaceStrong,
      borderColor: theme.divider,
    },
    transferBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginBottom: 10,
    },
    transferBadgePrimary: {
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    transferBadgeSecondary: {
      backgroundColor: theme.surfaceSoft,
    },
    transferBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    transferBadgeTextPrimary: {
      color: theme.heroText,
    },
    transferBadgeTextSecondary: {
      color: theme.accentText,
    },
    transferTitle: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },
    transferTitlePrimary: {
      color: theme.heroText,
    },
    transferTitleSecondary: {
      color: theme.text,
    },
    transferMeta: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 17,
      flexShrink: 1,
    },
    transferMetaPrimary: {
      color: theme.heroMuted,
    },
    transferMetaSecondary: {
      color: theme.textMuted,
    },
    importPanel: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 24,
      padding: 16,
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: 14,
    },
    importPanelCopy: {
      flex: 1,
      minWidth: 0,
    },
    importPanelTitle: {
      color: theme.text,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '800',
    },
    importPanelText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
    bottomNav: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: isCompact ? 12 : 16,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: `${theme.background}F2`,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    bottomNavItem: {
      flex: 1,
      borderRadius: 18,
      paddingVertical: 8,
      paddingHorizontal: 6,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      gap: 3,
    },
    bottomNavItemActive: {
      backgroundColor: theme.accent,
    },
    bottomNavIcon: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    bottomNavIconActive: {
      color: theme.heroText,
    },
    bottomNavText: {
      color: theme.textMuted,
      fontWeight: '800',
      fontSize: isNarrow ? 10 : 11,
    },
    bottomNavTextActive: {
      color: theme.heroText,
    },
    buttonDisabled: {
      opacity: 0.58,
    },
    categoryPreviewCard: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
      backgroundColor: theme.surfaceTint,
      borderRadius: 22,
      padding: 14,
      marginTop: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    categoryPreviewBubble: {
      width: 56,
      height: 56,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryPreviewBubbleText: {
      fontSize: 24,
      fontWeight: '800',
    },
    categoryPreviewCopy: {
      flex: 1,
      gap: 4,
    },
    categoryPreviewTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
    categoryPreviewText: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    categoryAdvancedPanel: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 18,
      padding: 12,
      marginTop: 12,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    categoryHelperRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 8,
      marginTop: 6,
      marginBottom: 6,
    },
    categoryToolButton: {
      alignSelf: 'flex-start',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    categoryStatusRow: {
      marginBottom: 6,
    },
    categoryStatusPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.surfaceTint,
      borderWidth: 1,
      borderColor: theme.divider,
      alignItems: 'center',
    },
    categoryStatusPillText: {
      color: theme.accentText,
      fontSize: 11,
      fontWeight: '700',
    },
    categoryActionRow: {
      gap: 8,
      marginTop: 10,
    },
    categoryActionButton: {
      width: '100%',
      alignSelf: 'stretch',
    },
    currentBudgetList: {
      gap: 10,
    },
    currentBudgetRow: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.divider,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
    },
    currentBudgetRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    currentBudgetRowLead: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    currentBudgetIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentBudgetIconText: {
      fontSize: 14,
      fontWeight: '800',
    },
    currentBudgetCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    currentBudgetName: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
    },
    currentBudgetMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    currentBudgetRowMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    currentBudgetRowMetaLeft: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    currentBudgetRowDetail: {
      flex: 1,
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 14,
    },
    currentBudgetCompareText: {
      color: theme.accentText,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 14,
    },
    currentBudgetRowMetaRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    currentBudgetAmountBlock: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    currentBudgetAmount: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
    },
    currentBudgetAmountAlert: {
      color: theme.alertText,
    },
    currentBudgetAmountMeta: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: 2,
    },
    currentBudgetTrack: {
      height: 6,
      borderRadius: 999,
      overflow: 'hidden',
    },
    currentBudgetFill: {
      height: '100%',
      borderRadius: 999,
    },
    currentBudgetStatusChip: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    currentBudgetStatusChipWarning: {
      backgroundColor: theme.warningSurface,
    },
    currentBudgetStatusChipAlert: {
      backgroundColor: theme.alertSurface,
    },
    currentBudgetStatusChipText: {
      fontSize: 10,
      fontWeight: '800',
    },
    currentBudgetStatusChipTextWarning: {
      color: theme.warningText,
    },
    currentBudgetStatusChipTextAlert: {
      color: theme.alertText,
    },
    currentBudgetUsageText: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    swipeRowShell: {
      width: '100%',
    },
    swipeRail: {
      gap: 8,
      justifyContent: 'center',
      paddingLeft: 8,
      paddingRight: 2,
    },
    swipeRailButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    swipeRailButtonPrimary: {
      backgroundColor: theme.accentSoft,
      borderWidth: 1,
      borderColor: theme.accentBorder,
    },
    swipeRailButtonDanger: {
      backgroundColor: theme.alertSurface,
    },
    swipeRailButtonText: {
      color: theme.accentText,
      fontSize: 11,
      fontWeight: '800',
    },
    swipeRailButtonTextPrimary: {
      color: theme.accentText,
      fontSize: 11,
      fontWeight: '800',
    },
    swipeRailButtonTextDanger: {
      color: theme.alertText,
      fontSize: 11,
      fontWeight: '800',
    },
    categoryDetailCard: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      gap: 12,
      marginBottom: 12,
    },
    categoryDetailStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryDetailStat: {
      flexBasis: isCompact ? '48%' : 0,
      flexGrow: 1,
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    categoryDetailStatLabel: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 4,
    },
    categoryDetailStatValue: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
    },
    categoryDetailTransactionList: {
      gap: 10,
      marginTop: 10,
    },
    categoryDetailTransactionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.divider,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    categoryDetailTransactionCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    categoryDetailTransactionTitle: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
    },
    categoryDetailTransactionMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 16,
    },
    categoryDetailTransactionAmount: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
    },
    categoryCard: {
      borderRadius: 16,
      padding: 10,
      marginBottom: 8,
      borderWidth: 1,
    },
    categoryTopRow: {
      gap: 8,
      alignItems: 'flex-start',
    },
    categoryLead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      width: '100%',
    },
    categoryBubble: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryBubbleText: {
      fontSize: 14,
      fontWeight: '800',
    },
    categoryCopy: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    categoryMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
    },
    categorySubcategoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    inlineSubcategoryEditor: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    inlineSubcategoryInput: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
      paddingVertical: 4,
    },
    categoryName: {
      fontSize: 14,
      lineHeight: 17,
      fontWeight: '800',
      color: theme.text,
    },
    bucketBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
      backgroundColor: theme.surfaceStrong,
    },
    bucketBadgeText: {
      color: theme.accentText,
      fontSize: 8,
      fontWeight: '800',
    },
    categoryAmountBadge: {
      backgroundColor: theme.surfaceMuted,
    },
    categoryAmountBadgeText: {
      color: theme.text,
    },
    subcategoryPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
      backgroundColor: theme.surfaceStrong,
    },
    subcategoryPillText: {
      color: theme.textMuted,
      fontSize: 8,
      fontWeight: '700',
    },
    categoryTone: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    categoryToneGood: {
      backgroundColor: theme.successSurface,
    },
    categoryToneWarning: {
      backgroundColor: theme.warningSurface,
    },
    categoryToneAlert: {
      backgroundColor: theme.alertSurface,
    },
    categoryToneText: {
      fontSize: 8,
      fontWeight: '700',
    },
    categoryToneTextGood: {
      color: theme.successText,
    },
    categoryToneTextWarning: {
      color: theme.warningText,
    },
    categoryToneTextAlert: {
      color: theme.alertText,
    },
    categoryTrack: {
      height: 6,
      borderRadius: 999,
      marginTop: 8,
      overflow: 'hidden',
    },
    categoryFill: {
      height: '100%',
      borderRadius: 999,
    },
    categoryMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
    },
    categoryMetricBlock: {
      flexBasis: '48%',
      flexGrow: 1,
    },
    categoryMetricLabel: {
      fontSize: 10,
      color: theme.textMuted,
      marginBottom: 2,
    },
    categoryMetricValue: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    inlineActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    inlineActionRowCompact: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
      justifyContent: 'flex-start',
    },
    inlineButton: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inlineButtonCompact: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    inlineButtonDanger: {
      backgroundColor: theme.alertSurface,
    },
    inlineButtonText: {
      color: theme.accentText,
      fontWeight: '800',
      fontSize: 10,
    },
    inlineButtonDangerText: {
      color: theme.alertText,
      fontWeight: '800',
      fontSize: 10,
    },
    formDivider: {
      height: 1,
      backgroundColor: theme.divider,
      marginVertical: 16,
    },
    goalList: {
      gap: 12,
      marginTop: 16,
    },
    goalCard: {
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
    },
    goalHeader: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    goalName: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    goalMeta: {
      color: theme.textMuted,
    },
    goalProgress: {
      color: theme.text,
      fontWeight: '800',
    },
    goalTrack: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
    },
    goalFill: {
      height: '100%',
      borderRadius: 999,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
      marginBottom: 16,
    },
    filterGroup: {
      marginTop: 6,
      marginBottom: 10,
    },
    filterGroupLabel: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    filterRowCompact: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    selectorHint: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 20,
      marginTop: -2,
      marginBottom: 12,
    },
    selectorDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.divider,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 12,
    },
    selectorDropdownTriggerActive: {
      borderColor: theme.accentBorder,
      backgroundColor: theme.surfaceTint,
    },
    selectorDropdownCopy: {
      flex: 1,
      minWidth: 0,
    },
    selectorDropdownTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 4,
    },
    selectorDropdownMeta: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    selectorDropdownState: {
      color: theme.accentText,
      fontSize: 12,
      fontWeight: '800',
    },
    selectorDropdownPanel: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 22,
      padding: 12,
      marginBottom: 16,
    },
    selectorDropdownScroll: {
      maxHeight: 320,
    },
    selectorSearchCard: {
      marginBottom: 12,
    },
    selectorGroupLabel: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    selectorList: {
      gap: 10,
      marginBottom: 16,
    },
    selectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surfaceSoft,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.surfaceSoft,
    },
    selectorRowActive: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accentBorder,
    },
    selectorRowCopy: {
      flex: 1,
      minWidth: 0,
    },
    selectorRowTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    selectorRowTitleActive: {
      color: theme.accentText,
    },
    selectorRowMeta: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    selectorRowMetaActive: {
      color: theme.accentText,
      opacity: 0.82,
    },
    selectorRowCode: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    selectorRowCodeActive: {
      color: theme.accentText,
    },
    selectorEmptyText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 12,
    },
    localePreviewCard: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 20,
      padding: 14,
      marginTop: -4,
      marginBottom: 4,
    },
    localePreviewTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 8,
    },
    localePreviewText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    filterChip: {
      backgroundColor: theme.surfaceSoft,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    filterChipActive: {
      backgroundColor: theme.accent,
    },
    filterChipText: {
      color: theme.textMuted,
      fontWeight: '700',
      fontSize: 11,
      textTransform: 'capitalize',
    },
    filterChipTextActive: {
      color: theme.heroText,
    },
    transactionSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surfaceTint,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 11,
      marginBottom: 14,
      gap: 12,
    },
    transactionSummaryText: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    transactionSummaryRight: {
      alignItems: 'flex-end',
      gap: 2,
    },
    transactionSummaryMeta: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    transactionSummaryValue: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
    },
    transactionCard: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      gap: 12,
      marginBottom: 10,
    },
    transactionCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    transactionLead: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    transactionIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transactionIconText: {
      fontSize: 16,
      fontWeight: '800',
    },
    transactionCopy: {
      flex: 1,
      minWidth: 0,
    },
    transactionTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 2,
    },
    transactionMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 16,
    },
    transactionAmount: {
      color: theme.text,
      fontWeight: '800',
      fontSize: isNarrow ? 18 : 20,
      lineHeight: isNarrow ? 22 : 24,
      textAlign: 'right',
    },
    transactionTagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    transactionTag: {
      backgroundColor: theme.surfaceSoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    transactionTagGood: {
      backgroundColor: theme.successSurface,
    },
    transactionTagWarning: {
      backgroundColor: theme.warningSurface,
    },
    transactionTagAlert: {
      backgroundColor: theme.alertSurface,
    },
    transactionTagText: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    transactionTagTextGood: {
      color: theme.successText,
    },
    transactionTagTextWarning: {
      color: theme.warningText,
    },
    transactionTagTextAlert: {
      color: theme.alertText,
    },
    transactionCardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    emptyState: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 22,
      padding: 18,
      alignItems: 'center',
      marginTop: 12,
    },
    emptyStateCompact: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      padding: 14,
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 10,
    },
    planSetupHint: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
    },
    planCollapsedSummary: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 12,
      marginTop: 4,
      marginBottom: 8,
    },
    planCollapsedSummaryTitle: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
    },
    planCollapsedSummaryText: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 17,
    },
    planFinishCard: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 24,
      padding: 16,
      marginTop: 18,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    planFinishTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    planFinishText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },
    compactHighlightRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    compactHighlightChip: {
      backgroundColor: theme.surface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    compactHighlightText: {
      color: theme.text,
      fontSize: 11,
      fontWeight: '700',
    },
    planReviewBadgeGood: {
      backgroundColor: theme.successSurface,
    },
    planReviewBadgeWarning: {
      backgroundColor: theme.warningSurface,
    },
    planReviewBadgeAlert: {
      backgroundColor: theme.alertSurface,
    },
    reviewCopy: {
      flex: 1,
      gap: 4,
    },
    reviewTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '800',
    },
    emptyActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
      marginTop: 14,
    },
    insightStatGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    insightStatCard: {
      flexBasis: isNarrow ? '100%' : '48%',
      flexGrow: 1,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    insightStatLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
    },
    insightStatValue: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
    },
    forecastStatMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },
    weeklyInsightList: {
      gap: 10,
      marginTop: 10,
    },
    weeklyInsightStrip: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    weeklyInsightMiniCard: {
      flex: 1,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: theme.divider,
      alignItems: 'center',
      gap: 5,
      minWidth: 0,
    },
    weeklyInsightMiniLabel: {
      color: theme.text,
      fontSize: 10,
      fontWeight: '800',
    },
    weeklyInsightMiniState: {
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    weeklyInsightMiniStateText: {
      fontSize: 9,
      fontWeight: '800',
    },
    weeklyInsightMiniTrack: {
      width: '100%',
      height: 82,
      justifyContent: 'flex-end',
      alignItems: 'center',
      position: 'relative',
      paddingBottom: 4,
    },
    weeklyInsightMiniAxis: {
      position: 'absolute',
      left: '16%',
      right: '16%',
      bottom: 4,
      height: 2,
      borderRadius: 999,
      backgroundColor: theme.divider,
    },
    weeklyInsightMiniFill: {
      width: '46%',
      minWidth: 18,
      maxWidth: 28,
      borderRadius: 12,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      backgroundColor: theme.surfaceStrong,
    },
    weeklyInsightMiniFixed: {
      width: '100%',
      backgroundColor: theme.accentSoft,
    },
    weeklyInsightMiniFlexible: {
      width: '100%',
      backgroundColor: theme.accent,
    },
    weeklyInsightMiniAmount: {
      color: theme.text,
      fontSize: 10,
      fontWeight: '800',
      textAlign: 'center',
    },
    weeklyInsightMiniMeta: {
      color: theme.textMuted,
      fontSize: 8,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 11,
      minHeight: 22,
    },
    weeklyInsightRow: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      gap: 10,
    },
    weeklyInsightHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    weeklyInsightCopy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    weeklyInsightLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
    },
    weeklyInsightMeta: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 16,
    },
    weeklyInsightRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    weeklyInsightState: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    weeklyInsightStateUpcoming: {
      backgroundColor: theme.surfaceStrong,
    },
    weeklyInsightStateCurrent: {
      backgroundColor: theme.accentSoft,
    },
    weeklyInsightStateDone: {
      backgroundColor: theme.successSurface,
    },
    weeklyInsightStateText: {
      fontSize: 10,
      fontWeight: '800',
    },
    weeklyInsightStateTextUpcoming: {
      color: theme.textMuted,
    },
    weeklyInsightStateTextCurrent: {
      color: theme.accentText,
    },
    weeklyInsightStateTextDone: {
      color: theme.successText,
    },
    weeklyInsightAmount: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '800',
    },
    weeklyInsightAmountMeta: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    weeklyInsightTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: theme.surfaceStrong,
      overflow: 'hidden',
    },
    weeklyInsightFill: {
      height: '100%',
      borderRadius: 999,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    weeklyInsightFixed: {
      backgroundColor: theme.accentSoft,
    },
    weeklyInsightFlexible: {
      height: '100%',
      backgroundColor: theme.accent,
    },
    insightLegendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 6,
      marginBottom: 6,
    },
    insightLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    insightLegendSwatch: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    insightLegendSwatchFixed: {
      backgroundColor: theme.accentSoft,
    },
    insightLegendSwatchFlexible: {
      backgroundColor: theme.accent,
    },
    insightLegendText: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    insightBarList: {
      gap: 10,
      marginTop: 12,
    },
    insightBarRow: {
      gap: 8,
    },
    insightBarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    insightBarLabel: {
      color: theme.text,
      fontWeight: '800',
      fontSize: 13,
      flex: 1,
    },
    insightBarMeta: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    insightBarTrack: {
      height: 12,
      borderRadius: 999,
      backgroundColor: theme.surfaceStrong,
      overflow: 'hidden',
    },
    insightBarFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: theme.accent,
    },
    stackedInsightTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.surfaceStrong,
      overflow: 'hidden',
    },
    stackedInsightFill: {
      height: '100%',
      borderRadius: 999,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    stackedInsightFixed: {
      backgroundColor: theme.accentSoft,
    },
    stackedInsightFlexible: {
      backgroundColor: theme.accent,
    },
    suggestionList: {
      gap: 10,
      marginTop: 12,
    },
    suggestionCard: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    suggestionBadge: {
      width: 30,
      height: 30,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    suggestionBadgeText: {
      color: theme.heroText,
      fontSize: 12,
      fontWeight: '800',
    },
    suggestionText: {
      flex: 1,
      color: theme.text,
      lineHeight: 20,
    },
    aiReviewMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    aiReviewSummaryCard: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      gap: 6,
      marginTop: 10,
    },
    aiReviewSummaryText: {
      color: theme.text,
      lineHeight: 20,
    },
    aiReviewWatchout: {
      backgroundColor: theme.warningSurface,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      gap: 6,
      marginTop: 10,
    },
    aiReviewActionList: {
      gap: 8,
      marginTop: 10,
    },
    aiReviewActionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    aiReviewActionIndex: {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    aiReviewActionText: {
      flex: 1,
      color: theme.text,
      lineHeight: 18,
    },
    aiReviewErrorText: {
      color: theme.alertText,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 10,
    },
    emptyTitle: {
      color: theme.text,
      fontWeight: '800',
      marginBottom: 4,
    },
    emptyText: {
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    sectionActionRow: {
      marginTop: 10,
    },
  });
