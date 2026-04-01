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
  LayoutAnimation,
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
  getProjectedSpend,
  getUserStorageKey,
  languageOptions,
  type MonthRecord,
  getTotalPlanned,
  getTotalSpent,
  parseMonthId,
  getWeeklyTotals,
  LOCAL_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  normalizeBudgetAppState,
  quickPresets,
  rollMonthForward,
  sortTransactions,
  themeCycle,
  type AppTheme,
  type AppThemeId,
  type BudgetAppState,
  type Category,
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
  ensureBudgetCloudUser,
  loadBudgetCloudState,
  saveBudgetCloudState,
  signInBudgetPasswordUser,
  signOutBudgetUser,
  subscribeToBudgetAuth,
  type BudgetAuthUser,
} from './firebaseClient';

type SaveState = 'hydrating' | 'saving' | 'saved' | 'error';
type CloudState = 'connecting' | 'syncing' | 'synced' | 'local-only';
type TransactionFilter = 'all' | 'over' | 'healthy';
type TransactionSort = 'recent' | 'highest';
type AuthMode = 'create' | 'signin';
type ScreenId = 'home' | 'spend' | 'plan' | 'insights' | 'settings';
type InsightWindow = 'quarter' | 'half' | 'year';
type AlertTone = 'good' | 'warning' | 'alert';
type BudgetStarterId = 'essentials' | 'balanced' | 'flex';

type InsightSummary = {
  averageMonthlySpend: number;
  months: Array<{ id: string; label: string; spent: number; planned: number }>;
  overBudgetMonths: number;
  previousSpend: number;
  topCategory: { name: string; spent: number } | null;
  totalPlanned: number;
  totalSpent: number;
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

const budgetStarterPacks: Array<{
  id: BudgetStarterId;
  title: string;
  description: string;
  suggestedLimit: string;
  presetNames: string[];
}> = [
  {
    id: 'essentials',
    title: 'Essentials',
    description: 'Cover the fixed basics first.',
    suggestedLimit: '1600',
    presetNames: ['Rent', 'Groceries', 'Transport'],
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: 'A realistic month with room for routine extras.',
    suggestedLimit: '1750',
    presetNames: ['Rent', 'Groceries', 'Transport', 'Streaming', 'Coffee'],
  },
  {
    id: 'flex',
    title: 'Flexible',
    description: 'A lighter base for shared housing or lean months.',
    suggestedLimit: '900',
    presetNames: ['Groceries', 'Transport', 'Streaming'],
  },
];

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

const buildInsightSummary = (
  months: MonthRecord[],
  previousMonths: MonthRecord[],
  localeTag: string,
): InsightSummary => {
  const totalSpent = months.reduce((sum, month) => sum + getTotalSpent(month), 0);
  const totalPlanned = months.reduce((sum, month) => sum + getTotalPlanned(month), 0);
  const previousSpend = previousMonths.reduce((sum, month) => sum + getTotalSpent(month), 0);
  const overBudgetMonths = months.filter((month) => {
    const monthPlan = getTotalPlanned(month) || Number(month.monthlyLimit) || 0;
    return monthPlan > 0 && getTotalSpent(month) > monthPlan;
  }).length;
  const categoryTotals = new Map<string, number>();

  months.forEach((month) => {
    getCategorySummaries(month).forEach((summary) => {
      categoryTotals.set(
        summary.category.name,
        (categoryTotals.get(summary.category.name) ?? 0) + summary.spent,
      );
    });
  });

  const topCategoryEntry = [...categoryTotals.entries()].sort((left, right) => right[1] - left[1])[0];

  return {
    averageMonthlySpend: months.length > 0 ? totalSpent / months.length : 0,
    months: months
      .map((month) => ({
        id: month.id,
        label: getMonthLabel(month.id, localeTag),
        spent: getTotalSpent(month),
        planned: getTotalPlanned(month),
      }))
      .reverse(),
    overBudgetMonths,
    previousSpend,
    topCategory: topCategoryEntry ? { name: topCategoryEntry[0], spent: topCategoryEntry[1] } : null,
    totalPlanned,
    totalSpent,
    trendDelta:
      previousSpend > 0 ? (totalSpent - previousSpend) / previousSpend : months.length > 1 ? 0 : null,
  };
};

const buildInsightSuggestions = (
  summary: InsightSummary,
  window: InsightWindow,
): string[] => {
  const suggestions: string[] = [];
  const topCategoryShare =
    summary.topCategory && summary.totalSpent > 0 ? summary.topCategory.spent / summary.totalSpent : 0;

  if (summary.overBudgetMonths > 0) {
    suggestions.push(
      `${summary.overBudgetMonths} of the last ${summary.months.length} ${insightWindowMeta[window].label.toLowerCase()} periods finished over plan. Tighten the hottest categories first.`,
    );
  }

  if (summary.trendDelta !== null && summary.trendDelta > 0.12) {
    suggestions.push(
      `Spending is up ${Math.round(summary.trendDelta * 100)}% versus the previous ${insightWindowMeta[window].label.toLowerCase()} window.`,
    );
  }

  if (summary.topCategory && topCategoryShare >= 0.3) {
    suggestions.push(
      `${summary.topCategory.name} drives ${Math.round(topCategoryShare * 100)}% of spend in this window. That is the clearest place to optimise.`,
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('Spending is comparatively stable in this window. Keep the plan steady and review only the categories that changed most recently.');
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
  const averageDailySpend = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const spendToDateTarget = forecastBase > 0 ? (forecastBase / daysInMonth) * daysElapsed : 0;
  const spendGap = totalSpent - spendToDateTarget;
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
        const projectedCategorySpend =
          isCurrentMonth && daysElapsed > 0
            ? (summary.spent / daysElapsed) * daysInMonth
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
      title: 'Running ahead of the pace line',
      body: `Spend is ${format(snapshot.spendGap)} ahead of the ideal spend-to-date mark.`,
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

const extractPdfTextWithPdfJs = async (uri: string) => {
  const pdfjs: { getDocument: (source: Record<string, unknown>) => { promise: Promise<any> } } =
    require('pdfjs-dist/legacy/build/pdf.js');
  const base64Content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdfBytes = decodeBase64ToBytes(base64Content);
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
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
  const [expenseDate, setExpenseDate] = useState(() => new Date());
  const [expenseRecurring, setExpenseRecurring] = useState(false);
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryPlanned, setCategoryPlanned] = useState('');
  const [categoryRecurring, setCategoryRecurring] = useState(true);
  const [categoryThemeId, setCategoryThemeId] = useState<ThemeId>('citrus');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [starterPackId, setStarterPackId] = useState<BudgetStarterId>('balanced');
  const [starterMonthlyLimit, setStarterMonthlyLimit] = useState('');

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');
  const [goalThemeId, setGoalThemeId] = useState<ThemeId>('sun');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [transactionSort, setTransactionSort] = useState<TransactionSort>('recent');
  const [insightWindow, setInsightWindow] = useState<InsightWindow>('quarter');

  const latestStateRef = useRef(appState);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const pendingGuestResetRef = useRef(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 430;
  const isNarrow = width < 375;

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
  const formatCurrency = (value: number) => currency(value, currentCurrencyCode, localeTag);
  const localeDatePreview = new Intl.DateTimeFormat(localeTag, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const localeCurrencyPreview = formatCurrency(2450.75);
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

  const starterPackSummaries = useMemo(
    () =>
      budgetStarterPacks.map((pack) => {
        const presets = pack.presetNames
          .map((name) => quickPresets.find((preset) => preset.name === name))
          .filter((preset): preset is (typeof quickPresets)[number] => Boolean(preset));

        return {
          ...pack,
          presets,
          plannedTotal: presets.reduce((sum, preset) => sum + preset.planned, 0),
        };
      }),
    [],
  );
  const activeMonth =
    sortedMonths.find((month) => month.id === appState.activeMonthId) ?? sortedMonths[0];
  const localeMonthPreview = getMonthLabel(activeMonth.id, localeTag);
  const hasActiveBudget = activeMonth ? activeMonth.categories.length > 0 : false;
  const selectedStarterPack =
    starterPackSummaries.find((pack) => pack.id === starterPackId) ?? starterPackSummaries[1];
  const starterLimitSuggestions = useMemo(
    () =>
      [
        selectedStarterPack.suggestedLimit,
        String(selectedStarterPack.plannedTotal),
        '1200',
        '1800',
        '2500',
      ].filter((value, index, allValues) => Number(value) > 0 && allValues.indexOf(value) === index),
    [selectedStarterPack.plannedTotal, selectedStarterPack.suggestedLimit],
  );
  const fallbackTemplateMonth = useMemo(
    () =>
      sortedMonths.find(
        (month) =>
          month.id !== activeMonth?.id &&
          (month.categories.length > 0 || month.transactions.length > 0),
      ) ?? null,
    [activeMonth?.id, sortedMonths],
  );

  const categorySummaries = useMemo(
    () => (activeMonth ? getCategorySummaries(activeMonth) : []),
    [activeMonth],
  );
  const weeklyTotals = useMemo(
    () => (activeMonth ? getWeeklyTotals(activeMonth.transactions) : [0, 0, 0, 0]),
    [activeMonth],
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
  const projectedRemaining =
    forecastSnapshot.forecastBase > 0 ? forecastSnapshot.forecastBase - projectedSpend : 0;
  const onTrackCount = categorySummaries.filter((summary) => summary.spent <= summary.category.planned)
    .length;
  const overCount = categorySummaries.length - onTrackCount;
  const activeMonthName = activeMonth ? getMonthName(activeMonth.id, localeTag) : 'This month';
  const isCurrentMonth = activeMonth ? activeMonth.id === getMonthId(new Date()) : true;
  const averageDailySpend = activeMonth
    ? totalSpent /
      Math.max(
        isCurrentMonth ? new Date().getDate() : getDaysInMonth(activeMonth.id),
        1,
      )
    : 0;
  const monthlyProgress = monthlyLimitNumber > 0 ? totalSpent / monthlyLimitNumber : 0;
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

        return matchesQuery && matchesFilter;
      }),
      transactionSort,
    );
  }, [activeMonth, categoryToneById, searchQuery, transactionFilter, transactionSort]);

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
      ? `vs ${formatCurrency(forecastSnapshot.spendToDateTarget)} target by day ${forecastSnapshot.daysElapsed}`
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
      ? `At ${formatCurrency(forecastSnapshot.averageDailySpend)} per day`
      : 'No spending pace recorded yet.';
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
  const screenMeta: Record<ScreenId, { label: string; title: string; subtitle: string }> = {
    home: {
      label: 'Home',
      title: 'This month at a glance',
      subtitle: 'Keep the first screen focused on progress, drift, and what needs attention.',
    },
    spend: {
      label: 'Spend',
      title: 'Capture and review expenses',
      subtitle: 'Add transactions quickly, then clean up or search the ledger.',
    },
    plan: {
      label: 'Plan',
      title: 'Shape the budget',
      subtitle: 'Manage categories, recurring plans, and savings goals.',
    },
    insights: {
      label: 'Insights',
      title: 'Zoom out on the trend',
      subtitle: 'Review quarter, 6-month, and yearly patterns with clearer suggestions.',
    },
    settings: {
      label: 'Settings',
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

  const resetTransactionForm = () => {
    setExpenseAmount('');
    setExpenseNote('');
    setExpenseDate(getDefaultExpenseDate(activeMonth?.id ?? getMonthId(new Date())));
    setExpenseRecurring(false);
    setShowExpenseDatePicker(false);
    setEditingTransactionId(null);
  };

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryPlanned('');
    setCategoryRecurring(true);
    setCategoryThemeId('citrus');
    setEditingCategoryId(null);
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
      return;
    }

    updateAppState((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        appThemeId: themeId,
      },
    }));
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
    if (!activeMonth || editingTransactionId) {
      return;
    }

    setExpenseDate(getDefaultExpenseDate(activeMonth.id));
    setShowExpenseDatePicker(false);
  }, [activeMonth?.id, editingTransactionId]);

  useEffect(() => {
    if (hasActiveBudget) {
      return;
    }

    setStarterMonthlyLimit((current) => {
      const trimmedCurrent = current.trim();
      const monthLimit = activeMonth.monthlyLimit.trim();

      if (monthLimit && monthLimit !== '0') {
        return monthLimit;
      }

      if (trimmedCurrent && trimmedCurrent !== '0') {
        return current;
      }

      return selectedStarterPack.suggestedLimit;
    });
  }, [activeMonth.monthlyLimit, hasActiveBudget, selectedStarterPack.suggestedLimit]);

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

  const selectMonth = (monthId: string) => {
    updateAppState((current) => ({
      ...current,
      activeMonthId: monthId,
    }));
    resetTransactionForm();
    resetCategoryForm();
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

  const resolveStarterMonthlyLimit = () => {
    const parsedLimit = Number(starterMonthlyLimit);

    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      return String(parsedLimit);
    }

    const fallbackLimit = Math.max(
      Number(selectedStarterPack.suggestedLimit) || 0,
      selectedStarterPack.plannedTotal,
    );

    return String(fallbackLimit || 0);
  };

  const selectStarterPack = (packId: BudgetStarterId) => {
    const nextPack = starterPackSummaries.find((pack) => pack.id === packId);

    if (!nextPack) {
      return;
    }

    setStarterPackId(packId);
    setStarterMonthlyLimit((current) => {
      const trimmedCurrent = current.trim();

      if (
        !trimmedCurrent ||
        trimmedCurrent === '0' ||
        starterPackSummaries.some((pack) => pack.suggestedLimit === trimmedCurrent)
      ) {
        return nextPack.suggestedLimit;
      }

      return current;
    });
  };

  const createStarterBudget = () => {
    if (!activeMonth) {
      return;
    }

    const nextLimit = resolveStarterMonthlyLimit();

    updateActiveMonth((month) => ({
      ...month,
      monthlyLimit: nextLimit,
      categories: selectedStarterPack.presets.map((preset) => ({
        id: createId('cat'),
        name: preset.name,
        planned: preset.planned,
        themeId: preset.themeId,
        recurring: preset.recurring,
      })),
      transactions: [],
    }));

    resetCategoryForm();
    resetTransactionForm();
    setActiveScreen('plan');
  };

  const openBudgetBuilder = (options?: { applyStarterLimit?: boolean }) => {
    if (options?.applyStarterLimit && !hasActiveBudget) {
      const nextLimit = resolveStarterMonthlyLimit();

      updateActiveMonth((month) => ({
        ...month,
        monthlyLimit: nextLimit,
      }));
    }

    resetCategoryForm();
    setActiveScreen('plan');
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
    setActiveScreen('plan');
  };

  const copyPreviousBudgetIntoActiveMonth = () => {
    if (!fallbackTemplateMonth) {
      return;
    }

    replaceMonthWithBudgetCopy(fallbackTemplateMonth, activeMonth.id);
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
              recurring: expenseRecurring,
              happenedAt: nextDate,
            },
            ...month.transactions,
          ],
    }));

    resetTransactionForm();
  };

  const editTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setExpenseAmount(String(transaction.amount));
    setExpenseNote(transaction.note);
    setExpenseCategoryId(transaction.categoryId);
    setExpenseDate(clampDateToMonth(new Date(transaction.happenedAt), activeMonth.id));
    setExpenseRecurring(transaction.recurring);
    setShowExpenseDatePicker(false);
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

  const submitCategory = () => {
    if (!activeMonth) {
      return;
    }

    const planned = Number(categoryPlanned);
    const trimmedName = categoryName.trim();

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
              recurring: categoryRecurring,
              themeId: categoryThemeId,
            },
            ...month.categories,
          ],
    }));

    resetCategoryForm();
  };

  const editCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryPlanned(String(category.planned));
    setCategoryRecurring(category.recurring);
    setCategoryThemeId(category.themeId);
    setActiveScreen('plan');
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

  const addPreset = (preset: (typeof quickPresets)[number]) => {
    if (!activeMonth) {
      return;
    }

    const alreadyExists = activeMonth.categories.some(
      (category) => category.name.toLowerCase() === preset.name.toLowerCase(),
    );

    if (alreadyExists) {
      return;
    }

    updateActiveMonth((month) => ({
      ...month,
      categories: [
        {
          id: createId('cat'),
          name: preset.name,
          planned: preset.planned,
          themeId: preset.themeId,
          recurring: preset.recurring,
        },
        ...month.categories,
      ],
    }));
  };

  const customizePreset = (preset: (typeof quickPresets)[number]) => {
    setEditingCategoryId(null);
    setCategoryName(preset.name);
    setCategoryPlanned(String(preset.planned));
    setCategoryRecurring(preset.recurring);
    setCategoryThemeId(preset.themeId);
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
      Alert.alert('Import failed', 'The selected file could not be imported.');
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

              <Text style={styles.heroTitle}>Keep {activeMonthName} under control.</Text>
              <Text style={styles.heroSubtitle}>
                {isCurrentMonth
                  ? `Watch pace, forecast, and pressure points for ${activeMonthName.toLowerCase()}.`
                  : `Review ${activeMonthName.toLowerCase()} history or roll forward recurring plans.`}
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
                  <Text style={styles.limitPrefix}>$</Text>
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
                  <Text style={styles.metricTileLabel}>Forecast</Text>
                  <Text
                    style={[
                      styles.metricTileValue,
                      projectedRemaining < 0 ? styles.metricTileValueAlert : styles.metricTileValueGood,
                    ]}
                  >
                    {formatCurrency(projectedSpend)}
                  </Text>
                </View>

                <View style={styles.metricTile}>
                  <Text style={styles.metricTileLabel}>Daily pace</Text>
                  <Text style={styles.metricTileValue}>{formatCurrency(averageDailySpend)}</Text>
                </View>
              </View>
            </View>

            {!hasActiveBudget ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Start this budget</Text>
                <Text style={styles.sectionSubtitle}>
                  This month is blank. Pick a starter template, set a monthly limit, then refine the details in Plan.
                </Text>

                <View style={[styles.fieldCard, styles.fieldWide, styles.starterLimitCard]}>
                  <Text style={styles.fieldLabel}>Monthly limit</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={starterMonthlyLimit}
                    onChangeText={setStarterMonthlyLimit}
                    keyboardType="numeric"
                    placeholder={selectedStarterPack.suggestedLimit}
                    placeholderTextColor={currentTheme.placeholder}
                    selectionColor={currentTheme.accent}
                  />
                  <Text style={styles.fieldHint}>
                    Start with {formatCurrency(selectedStarterPack.plannedTotal)} planned across{' '}
                    {selectedStarterPack.presets.length} starter categories.
                  </Text>
                </View>

                <View style={styles.filterRow}>
                  {starterLimitSuggestions.map((value) => {
                    const selected = starterMonthlyLimit.trim() === value;

                    return (
                      <Pressable
                        key={value}
                        style={[styles.filterChip, selected && styles.filterChipActive]}
                        onPress={() => setStarterMonthlyLimit(value)}
                      >
                        <Text
                          style={[styles.filterChipText, selected && styles.filterChipTextActive]}
                        >
                          {formatCurrency(Number(value))}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.budgetStarterGrid}>
                  {starterPackSummaries.map((pack) => {
                    const selected = selectedStarterPack.id === pack.id;

                    return (
                      <Pressable
                        key={pack.id}
                        style={[styles.budgetStarterCard, selected && styles.budgetStarterCardActive]}
                        onPress={() => selectStarterPack(pack.id)}
                      >
                        <Text
                          style={[
                            styles.budgetStarterCardTitle,
                            selected && styles.budgetStarterCardTitleActive,
                          ]}
                        >
                          {pack.title}
                        </Text>
                        <Text
                          style={[
                            styles.budgetStarterCardMeta,
                            selected && styles.budgetStarterCardMetaActive,
                          ]}
                        >
                          {pack.description}
                        </Text>
                        <Text
                          style={[
                            styles.budgetStarterCardFoot,
                            selected && styles.budgetStarterCardFootActive,
                          ]}
                        >
                          {pack.presets.length} lanes • {formatCurrency(pack.plannedTotal)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.budgetStarterPreview}>
                  <Text style={styles.budgetStarterPreviewTitle}>
                    {selectedStarterPack.title} includes
                  </Text>
                  <Text style={styles.budgetStarterPreviewText}>
                    {selectedStarterPack.presets.map((preset) => preset.name).join(', ')}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.primaryButton} onPress={createStarterBudget}>
                    <Text style={styles.primaryButtonText}>Create starter budget</Text>
                  </Pressable>
                  <Pressable
                    style={styles.ghostButton}
                    onPress={() => openBudgetBuilder({ applyStarterLimit: true })}
                  >
                    <Text style={styles.ghostButtonText}>Build manually</Text>
                  </Pressable>
                  {fallbackTemplateMonth ? (
                    <Pressable style={styles.ghostButton} onPress={copyPreviousBudgetIntoActiveMonth}>
                      <Text style={styles.ghostButtonText}>
                        Copy {getMonthLabel(fallbackTemplateMonth.id, localeTag)}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Quick navigation</Text>
              <Text style={styles.sectionSubtitle}>
                Jump straight into expense logging, planning, or settings.
              </Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.primaryButton} onPress={() => setActiveScreen('spend')}>
                  <Text style={styles.primaryButtonText}>Go to spend</Text>
                </Pressable>
                <Pressable style={styles.ghostButton} onPress={() => setActiveScreen('plan')}>
                  <Text style={styles.ghostButtonText}>Open plan</Text>
                </Pressable>
                <Pressable style={styles.ghostButton} onPress={() => setActiveScreen('insights')}>
                  <Text style={styles.ghostButtonText}>Open insights</Text>
                </Pressable>
                <Pressable style={styles.ghostButton} onPress={() => setActiveScreen('settings')}>
                  <Text style={styles.ghostButtonText}>Open settings</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Month history</Text>
                  <Text style={styles.sectionSubtitle}>
                    Browse saved months or roll the budget forward with recurring items.
                  </Text>
                </View>

                <Pressable style={styles.secondaryButton} onPress={rollToNextMonth}>
                  <Text style={styles.secondaryButtonText}>+ Next month</Text>
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
                  <Pressable style={styles.ghostButton} onPress={copyActiveBudgetToNewMonth}>
                    <Text style={styles.ghostButtonText}>Copy this budget</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.trendCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Forecast and alerts</Text>
                  <Text style={styles.sectionSubtitle}>
                    Focus on what is drifting, not just what already happened.
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
                  <Text style={styles.trendValueSmall}>
                    {riskLabel}
                  </Text>
                </View>

                <View>
                  <Text style={styles.trendKicker}>Forecast confidence</Text>
                  <Text style={styles.trendValueSmall}>
                    {forecastSnapshot.confidenceLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.chartRow}>
                {['W1', 'W2', 'W3', 'W4'].map((label, index) => {
                  const maxWeeklySpend = Math.max(...weeklyTotals, 1);
                  const barHeight = 26 + Math.round((weeklyTotals[index] / maxWeeklySpend) * 86);

                  return (
                    <View key={label} style={styles.chartColumn}>
                      <View style={styles.chartTrack}>
                        <View style={[styles.chartBar, { height: barHeight }]} />
                      </View>
                      <Text style={styles.chartAmount}>{formatCurrency(weeklyTotals[index])}</Text>
                      <Text style={styles.chartLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{screenMeta[activeScreen].title}</Text>
            <Text style={styles.sectionSubtitle}>{screenMeta[activeScreen].subtitle}</Text>
          </View>
        )}

        {activeScreen === 'spend' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Quick expense</Text>
              <Text style={styles.sectionSubtitle}>
                Add transactions, mark recurring charges, or edit an existing expense.
              </Text>

              {activeMonth.categories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Start with a category</Text>
                  <Text style={styles.emptyText}>
                    Add your first budget lane in Plan, then come back here to log expenses against it.
                  </Text>
                  <View style={styles.emptyActionRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => openBudgetBuilder()}>
                      <Text style={styles.secondaryButtonText}>Open plan</Text>
                    </Pressable>
                    {fallbackTemplateMonth ? (
                      <Pressable style={styles.secondaryButton} onPress={copyPreviousBudgetIntoActiveMonth}>
                        <Text style={styles.secondaryButtonText}>Copy previous budget</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : (
                <>
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
                          onPress={() => setExpenseCategoryId(category.id)}
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
                      thumbColor={
                        expenseRecurring ? currentTheme.switchThumbOn : currentTheme.switchThumbOff
                      }
                    />
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable style={styles.primaryButton} onPress={submitTransaction}>
                      <Text style={styles.primaryButtonText}>
                        {editingTransactionId ? 'Update expense' : 'Add expense'}
                      </Text>
                    </Pressable>

                    {editingTransactionId ? (
                      <Pressable style={styles.ghostButton} onPress={resetTransactionForm}>
                        <Text style={styles.ghostButtonText}>Cancel edit</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Transactions</Text>
              <Text style={styles.sectionSubtitle}>
                Search history, focus on over-budget categories, and clean up mistakes quickly.
              </Text>

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

              <View style={styles.filterRow}>
                {(['all', 'over', 'healthy'] as TransactionFilter[]).map((filter) => (
                  <Pressable
                    key={filter}
                    style={[
                      styles.filterChip,
                      transactionFilter === filter && styles.filterChipActive,
                    ]}
                    onPress={() => setTransactionFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        transactionFilter === filter && styles.filterChipTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                ))}

                {(['recent', 'highest'] as TransactionSort[]).map((sort) => (
                  <Pressable
                    key={sort}
                    style={[
                      styles.filterChip,
                      transactionSort === sort && styles.filterChipActive,
                    ]}
                    onPress={() => setTransactionSort(sort)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        transactionSort === sort && styles.filterChipTextActive,
                      ]}
                    >
                      {sort}
                    </Text>
                  </Pressable>
                ))}
              </View>

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
                filteredTransactions.map((transaction) => {
                  const category = activeMonth.categories.find(
                    (item) => item.id === transaction.categoryId,
                  );
                  const theme = category ? categoryThemes[category.themeId] : categoryThemes.citrus;

                  return (
                    <View key={transaction.id} style={styles.transactionRow}>
                      <View style={[styles.transactionIcon, { backgroundColor: theme.bubble }]}>
                        <Text style={[styles.transactionIconText, { color: theme.bubbleText }]}>
                          {category ? getCategoryIcon(category.name) : '•'}
                        </Text>
                      </View>

                      <View style={styles.transactionCopy}>
                        <Text style={styles.transactionTitle}>
                          {transaction.note || category?.name || 'Expense'}
                        </Text>
                        <Text style={styles.transactionMeta}>
                          {category?.name ?? 'Uncategorized'} • {formatTransactionDate(transaction.happenedAt, localeTag)}
                          {transaction.recurring ? ' • recurring' : ''}
                        </Text>
                      </View>

                      <View style={styles.transactionRight}>
                        <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount)}</Text>
                        <View style={styles.inlineActionRowCompact}>
                          <Pressable
                            style={styles.inlineButtonCompact}
                            onPress={() => editTransaction(transaction)}
                          >
                            <Text style={styles.inlineButtonText}>Edit</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.inlineButtonCompact, styles.inlineButtonDanger]}
                            onPress={() => deleteTransaction(transaction.id)}
                          >
                            <Text style={styles.inlineButtonDangerText}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : null}

        {activeScreen === 'plan' ? (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Categories and budgets</Text>
                  <Text style={styles.sectionSubtitle}>
                    Edit plan amounts, control recurring lanes, and remove categories cleanly.
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Starter categories</Text>
              <Text style={styles.selectorHint}>
                Quick add a preset, customize it before adding, or edit the matching category after it is in the budget.
              </Text>
              <View style={styles.presetWrap}>
                {quickPresets.map((preset) => {
                  const theme = categoryThemes[preset.themeId];
                  const matchingCategory =
                    activeMonth.categories.find(
                      (category) => category.name.toLowerCase() === preset.name.toLowerCase(),
                    ) ?? null;
                  const exists = Boolean(matchingCategory);

                  return (
                    <View
                      key={preset.name}
                      style={[
                        styles.presetChip,
                        { backgroundColor: theme.chip },
                        exists && styles.presetChipDisabled,
                      ]}
                    >
                      <Text style={[styles.presetName, { color: theme.chipText }]}>
                        {exists ? preset.name : `+ ${preset.name}`}
                      </Text>
                      <Text style={[styles.presetAmount, { color: theme.chipText }]}>
                        {formatCurrency(preset.planned)}
                      </Text>
                      <Text style={[styles.presetMeta, { color: theme.chipText }]}>
                        {preset.recurring ? 'Recurring category' : 'One-off category'}
                      </Text>

                      <View style={styles.presetActionRow}>
                        <Pressable
                          style={[
                            styles.presetActionButton,
                            exists && styles.presetActionButtonDisabled,
                          ]}
                          disabled={exists}
                          onPress={() => addPreset(preset)}
                        >
                          <Text style={[styles.presetActionText, { color: theme.chipText }]}>
                            {exists ? 'Added' : 'Quick add'}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[styles.presetActionButton, styles.presetActionButtonSecondary]}
                          onPress={() =>
                            matchingCategory ? editCategory(matchingCategory) : customizePreset(preset)
                          }
                        >
                          <Text style={[styles.presetActionText, { color: theme.chipText }]}>
                            {matchingCategory ? 'Edit' : 'Customize'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              {categorySummaries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No categories added yet</Text>
                  <Text style={styles.emptyText}>
                    Use a preset above, customize one before adding it, or add a category manually below.
                  </Text>
                  <View style={styles.emptyActionRow}>
                    <Pressable style={styles.secondaryButton} onPress={createStarterBudget}>
                      <Text style={styles.secondaryButtonText}>Create starter budget</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => openBudgetBuilder({ applyStarterLimit: true })}
                    >
                      <Text style={styles.secondaryButtonText}>Set limit and build manually</Text>
                    </Pressable>
                    {fallbackTemplateMonth ? (
                      <Pressable style={styles.secondaryButton} onPress={copyPreviousBudgetIntoActiveMonth}>
                        <Text style={styles.secondaryButtonText}>Copy previous budget</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {categorySummaries.map((summary) => {
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
                        </View>
                      </View>

                      <View style={styles.categoryRight}>
                        <Text style={styles.categoryRightLabel}>Left</Text>
                        <Text
                          style={[
                            styles.categoryRightValue,
                            summary.left < 0 ? styles.metricTileValueAlert : styles.metricTileValueGood,
                          ]}
                        >
                          {formatCurrency(summary.left)}
                        </Text>
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

                      <View style={styles.categoryMetricBlock}>
                        <Text style={styles.categoryMetricLabel}>Recurring</Text>
                        <Text style={styles.categoryMetricValue}>
                          {summary.category.recurring ? 'Yes' : 'No'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.inlineActionRow}>
                      <Pressable style={styles.inlineButton} onPress={() => editCategory(summary.category)}>
                        <Text style={styles.inlineButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.inlineButton, styles.inlineButtonDanger]}
                        onPress={() => deleteCategory(summary.category.id)}
                      >
                        <Text style={styles.inlineButtonDangerText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <View style={styles.formDivider} />
              <Text style={styles.sectionTitle}>{editingCategoryId ? 'Edit category' : 'Add category'}</Text>

              <View style={styles.formShell}>
                <View style={[styles.fieldCard, styles.fieldWide]}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={categoryName}
                    onChangeText={setCategoryName}
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

              <View style={styles.actionRow}>
                <Pressable style={styles.primaryButton} onPress={submitCategory}>
                  <Text style={styles.primaryButtonText}>
                    {editingCategoryId ? 'Update category' : 'Add category'}
                  </Text>
                </Pressable>

                {editingCategoryId ? (
                  <Pressable style={styles.ghostButton} onPress={resetCategoryForm}>
                    <Text style={styles.ghostButtonText}>Cancel edit</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Savings goals</Text>
              <Text style={styles.sectionSubtitle}>
                Add a positive target so the app is not only about cutting spend.
              </Text>

              {appState.goals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No goals yet</Text>
                  <Text style={styles.emptyText}>
                    Add a savings target so the budget tracks progress toward something positive too.
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
          </>
        ) : null}

        {activeScreen === 'insights' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Long-range view</Text>
              <Text style={styles.sectionSubtitle}>
                Review imported and tracked months over quarter, 6-month, and yearly windows.
              </Text>

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

              <View style={styles.insightStatGrid}>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Window spend</Text>
                  <Text style={styles.insightStatValue}>{formatCurrency(insightSummary.totalSpent)}</Text>
                </View>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Average / month</Text>
                  <Text style={styles.insightStatValue}>{formatCurrency(insightSummary.averageMonthlySpend)}</Text>
                </View>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Over plan months</Text>
                  <Text style={styles.insightStatValue}>
                    {insightSummary.overBudgetMonths}/{insightSummary.months.length || 0}
                  </Text>
                </View>
                <View style={styles.insightStatCard}>
                  <Text style={styles.insightStatLabel}>Trend vs prior</Text>
                  <Text style={styles.insightStatValue}>
                    {insightSummary.trendDelta === null
                      ? 'New'
                      : `${insightSummary.trendDelta >= 0 ? '+' : ''}${Math.round(
                          insightSummary.trendDelta * 100,
                        )}%`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Spend over time</Text>
              <Text style={styles.sectionSubtitle}>
                {insightSummary.topCategory
                  ? `${insightSummary.topCategory.name} is currently the strongest driver in this window.`
                  : 'Import or track more months to unlock a clearer long-range pattern.'}
              </Text>

              {insightSummary.months.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No history yet</Text>
                  <Text style={styles.emptyText}>
                    Import your monthly PDFs or keep logging budgets to build quarter and yearly insights.
                  </Text>
                </View>
              ) : (
                <View style={styles.insightBarList}>
                  {insightSummary.months.map((month) => {
                    const width = Math.round(
                      clamp(month.spent / Math.max(...insightSummary.months.map((item) => item.spent), 1)) *
                        100,
                    );

                    return (
                      <View key={month.id} style={styles.insightBarRow}>
                        <View style={styles.insightBarHeader}>
                          <Text style={styles.insightBarLabel}>{month.label}</Text>
                          <Text style={styles.insightBarMeta}>
                            {formatCurrency(month.spent)} / {formatCurrency(month.planned)}
                          </Text>
                        </View>
                        <View style={styles.insightBarTrack}>
                          <View style={[styles.insightBarFill, { width: `${width}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Smart suggestions</Text>
              <Text style={styles.sectionSubtitle}>
                Local trend analysis based on the imported history. A real AI advisor can be added later on top.
              </Text>

              <View style={styles.suggestionList}>
                {insightSuggestions.map((suggestion, index) => (
                  <View key={`${suggestion}-${index}`} style={styles.suggestionCard}>
                    <View style={styles.suggestionBadge}>
                      <Text style={styles.suggestionBadgeText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {activeScreen === 'settings' ? (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>Appearance and account</Text>
                  <Text style={styles.sectionSubtitle}>
                    Switch the app mood, default budget currency, language, and account connection.
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Theme</Text>
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
                        <View
                          style={[styles.themeAccentSwatch, { backgroundColor: themeOption.orbPrimary }]}
                        />
                      </View>
                      <Text style={[styles.themeName, { color: themeOption.text }]}>{themeOption.name}</Text>
                      <Text style={[styles.themeMeta, { color: themeOption.textMuted }]}>
                        {themeOption.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

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
                        <Text style={styles.selectorEmptyText}>
                          No currencies matched that search.
                        </Text>
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

              <View style={styles.formDivider} />

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
                        style={[
                          styles.filterChip,
                          authMode === mode && styles.filterChipActive,
                        ]}
                        onPress={() => setAuthMode(mode)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            authMode === mode && styles.filterChipTextActive,
                          ]}
                        >
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
                        {authBusy
                          ? 'Working...'
                          : authMode === 'create'
                            ? 'Save account'
                            : 'Sign in'}
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
                      style={[styles.ghostButton, authBusy && styles.buttonDisabled]}
                      onPress={switchToGuestMode}
                      disabled={authBusy}
                    >
                      <Text style={styles.ghostButtonText}>
                        {authBusy ? 'Working...' : 'Sign out to guest mode'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>

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
            </View>
          </>
        ) : null}
      </ScrollView>
      <View style={styles.bottomNav}>
        {screenTabs.map((screenId) => (
          <Pressable
            key={screenId}
            style={[
              styles.bottomNavItem,
              activeScreen === screenId && styles.bottomNavItemActive,
            ]}
            onPress={() => setActiveScreen(screenId)}
          >
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
      paddingTop: 10,
      paddingBottom: 24,
    },
    heroCard: {
      backgroundColor: theme.hero,
      borderRadius: 30,
      padding: isCompact ? 18 : 20,
      marginBottom: 14,
      shadowColor: theme.heroShadow,
      shadowOpacity: 0.18,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    heroTopRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
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
      fontSize: isCompact ? 28 : 31,
      lineHeight: isCompact ? 33 : 36,
      fontWeight: '800',
      color: theme.heroText,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.heroMuted,
      maxWidth: isCompact ? undefined : 320,
      marginBottom: 6,
    },
    storageCaption: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 18,
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
      borderRadius: 24,
      padding: 16,
      marginBottom: 14,
    },
    limitLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.accentText,
      marginBottom: 10,
    },
    limitInputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.heroPanelSoft,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    limitPrefix: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
      marginRight: 6,
    },
    limitInput: {
      flex: 1,
      fontSize: 28,
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
      flexWrap: 'wrap',
      gap: 10,
    },
    metricTile: {
      flexBasis: isCompact ? '100%' : 0,
      flexGrow: 1,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: 14,
    },
    metricTileLabel: {
      color: theme.heroMuted,
      fontSize: 12,
      marginBottom: 6,
    },
    metricTileValue: {
      color: theme.heroText,
      fontWeight: '800',
      fontSize: 17,
    },
    metricTileValueGood: {
      color: theme.heroText,
    },
    metricTileValueAlert: {
      color: '#FFDCD2',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 18,
      marginBottom: 14,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    trendCard: {
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 18,
      marginBottom: 14,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    sectionHeader: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: isCompact ? 'stretch' : 'flex-start',
      marginBottom: 16,
    },
    sectionHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
      color: theme.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.textMuted,
      marginTop: 4,
      maxWidth: isCompact ? undefined : 300,
    },
    secondaryButton: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 9,
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    secondaryButtonText: {
      color: theme.accentText,
      fontSize: 12,
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
      gap: 10,
      marginBottom: 16,
    },
    alertCard: {
      borderRadius: 18,
      padding: 14,
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
      marginBottom: 18,
      gap: isCompact ? 12 : 0,
    },
    trendKicker: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 4,
    },
    trendValueSmall: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
    },
    chartRow: {
      flexDirection: 'row',
      flexWrap: isCompact ? 'wrap' : 'nowrap',
      gap: 12,
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
      height: 122,
      backgroundColor: theme.surfaceStrong,
      borderRadius: 18,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingBottom: 8,
      marginBottom: 8,
    },
    chartBar: {
      width: '100%',
      borderRadius: 12,
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
      marginTop: 3,
    },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 10,
    },
    themeCard: {
      width: isCompact ? '100%' : '48%',
      borderRadius: 22,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    },
    themeCardActive: {
      borderWidth: 2,
    },
    themePreviewRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    themeHeroSwatch: {
      flex: 1,
      height: 34,
      borderRadius: 12,
    },
    themeAccentSwatch: {
      width: 24,
      height: 24,
      borderRadius: 9,
    },
    themeName: {
      fontSize: 15,
      fontWeight: '800',
    },
    themeMeta: {
      fontSize: 12,
      lineHeight: 17,
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
    authStatusText: {
      marginBottom: 14,
      lineHeight: 18,
      fontWeight: '600',
    },
    formShell: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 14,
    },
    fieldCard: {
      flex: 1,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 6,
    },
    fieldWide: {
      flex: 1,
    },
    fieldLabel: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '700',
      marginBottom: 6,
    },
    fieldInput: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      paddingVertical: 8,
    },
    fieldValue: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      paddingTop: 4,
      paddingBottom: 2,
    },
    fieldHint: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '600',
      paddingBottom: 8,
    },
    dateFieldCard: {
      minHeight: 92,
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
      gap: 10,
    },
    selectionChip: {
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    selectionChipActive: {
      borderWidth: 2,
      borderColor: theme.accentBorder,
    },
    selectionChipText: {
      fontSize: 12,
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
      gap: 12,
      alignItems: isCompact ? 'stretch' : 'center',
      flexWrap: 'wrap',
    },
    primaryButton: {
      backgroundColor: theme.accent,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: theme.heroText,
      fontWeight: '800',
      fontSize: 15,
    },
    ghostButton: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ghostButtonText: {
      color: theme.accentText,
      fontWeight: '800',
      fontSize: 15,
    },
    starterLimitCard: {
      marginTop: 16,
      marginBottom: 10,
    },
    budgetStarterGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 14,
    },
    budgetStarterCard: {
      width: isCompact ? '100%' : '48%',
      borderRadius: 22,
      padding: 14,
      backgroundColor: theme.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    budgetStarterCardActive: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accentBorder,
    },
    budgetStarterCardTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 6,
    },
    budgetStarterCardTitleActive: {
      color: theme.accentText,
    },
    budgetStarterCardMeta: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 12,
    },
    budgetStarterCardMetaActive: {
      color: theme.accentText,
      opacity: 0.84,
    },
    budgetStarterCardFoot: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
    },
    budgetStarterCardFootActive: {
      color: theme.accentText,
    },
    budgetStarterPreview: {
      backgroundColor: theme.surfaceTint,
      borderRadius: 20,
      padding: 14,
      marginBottom: 16,
    },
    budgetStarterPreviewTitle: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 6,
    },
    budgetStarterPreviewText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    transferGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 16,
    },
    transferCard: {
      borderRadius: 24,
      padding: 16,
      minHeight: 144,
      borderWidth: 1,
      width: isCompact ? '100%' : '48%',
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
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 14,
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
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '800',
    },
    transferTitlePrimary: {
      color: theme.heroText,
    },
    transferTitleSecondary: {
      color: theme.text,
    },
    transferMeta: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
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
      paddingTop: 10,
      paddingBottom: 14,
      backgroundColor: `${theme.background}F2`,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    bottomNavItem: {
      flex: 1,
      borderRadius: 18,
      paddingVertical: 11,
      paddingHorizontal: 6,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
    },
    bottomNavItemActive: {
      backgroundColor: theme.accent,
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
    presetWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    presetChip: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 12,
      width: isCompact ? '100%' : '48%',
    },
    presetChipDisabled: {
      opacity: 0.62,
    },
    presetName: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
    },
    presetAmount: {
      fontSize: 18,
      fontWeight: '800',
    },
    presetMeta: {
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
      opacity: 0.82,
    },
    presetActionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    presetActionButton: {
      flex: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 9,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.56)',
    },
    presetActionButtonSecondary: {
      backgroundColor: 'rgba(255,255,255,0.28)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.34)',
    },
    presetActionButtonDisabled: {
      opacity: 0.56,
    },
    presetActionText: {
      fontSize: 12,
      fontWeight: '800',
    },
    categoryCard: {
      borderRadius: 26,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },
    categoryTopRow: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: isCompact ? 'flex-start' : 'center',
    },
    categoryLead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      flexShrink: 1,
    },
    categoryBubble: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryBubbleText: {
      fontSize: 20,
      fontWeight: '800',
    },
    categoryCopy: {
      flex: 1,
      gap: 6,
    },
    categoryName: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    categoryTone: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
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
      fontSize: 11,
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
    categoryRight: {
      alignItems: isCompact ? 'flex-start' : 'flex-end',
    },
    categoryRightLabel: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 4,
    },
    categoryRightValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    categoryTrack: {
      height: 10,
      borderRadius: 999,
      marginTop: 16,
      overflow: 'hidden',
    },
    categoryFill: {
      height: '100%',
      borderRadius: 999,
    },
    categoryMetrics: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 14,
    },
    categoryMetricBlock: {
      flexBasis: isCompact ? '47%' : 0,
      flexGrow: 1,
    },
    categoryMetricLabel: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 4,
    },
    categoryMetricValue: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    inlineActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 14,
    },
    inlineActionRowCompact: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
      justifyContent: isCompact ? 'flex-start' : 'flex-end',
    },
    inlineButton: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inlineButtonCompact: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    inlineButtonDanger: {
      backgroundColor: theme.alertSurface,
    },
    inlineButtonText: {
      color: theme.accentText,
      fontWeight: '800',
      fontSize: 12,
    },
    inlineButtonDangerText: {
      color: theme.alertText,
      fontWeight: '800',
      fontSize: 12,
    },
    formDivider: {
      height: 1,
      backgroundColor: theme.divider,
      marginVertical: 18,
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
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      backgroundColor: theme.accent,
    },
    filterChipText: {
      color: theme.textMuted,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    filterChipTextActive: {
      color: theme.heroText,
    },
    transactionRow: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    transactionIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transactionIconText: {
      fontSize: 18,
      fontWeight: '800',
    },
    transactionCopy: {
      flex: 1,
    },
    transactionTitle: {
      color: theme.text,
      fontWeight: '800',
      marginBottom: 4,
    },
    transactionMeta: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    transactionRight: {
      alignItems: isCompact ? 'flex-start' : 'flex-end',
    },
    transactionAmount: {
      color: theme.text,
      fontWeight: '800',
      fontSize: isNarrow ? 14 : 15,
    },
    emptyState: {
      backgroundColor: theme.surfaceMuted,
      borderRadius: 22,
      padding: 18,
      alignItems: 'center',
      marginTop: 12,
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
      gap: 10,
      marginTop: 6,
    },
    insightStatCard: {
      flexBasis: isCompact ? '100%' : '47%',
      flexGrow: 1,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 22,
      padding: 14,
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
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
    },
    insightBarList: {
      gap: 12,
      marginTop: 16,
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
    suggestionList: {
      gap: 12,
      marginTop: 16,
    },
    suggestionCard: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      backgroundColor: theme.surfaceMuted,
      borderRadius: 22,
      padding: 14,
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
      marginTop: 14,
    },
  });
