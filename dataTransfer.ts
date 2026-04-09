import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import {
  appThemes,
  parseBankAccountCustomKinds,
  normalizeBankAccountKinds,
  normalizeBankAccountKind,
  buildIsoDateForMonth,
  clamp,
  createId,
  currency,
  defaultCurrencyCode,
  defaultLanguageCode,
  getCategorySummaries,
  getMonthId,
  getMonthLabel,
  getLocaleTag,
  getProjectedSpend,
  getTotalPlanned,
  getTotalSpent,
  inferCategoryBucket,
  inferThemeId,
  parseSubcategoryInput,
  normalizeCurrencyCode,
  normalizeLanguageCode,
  normalizeBudgetAppState,
  type AppPreferences,
  type AppThemeId,
  type BankAccount,
  type BudgetAppState,
  type Category,
  type Goal,
  type MonthRecord,
  type ThemeId,
  type Transaction,
} from './budgetModel';

const PDF_IMPORT_MARKER = 'budget-buddy-backup:';
const ISAVE_MONEY_MARKER = 'Generated from iSaveMoney App';

const pdfIgnoredLines = new Set([
  'Incomes',
  'Expenditures',
  'Date',
  'Goal',
  'Actual Income',
  'Remaining',
  'Net Disposable Income',
  'Budget',
  'Spent',
  'Actual',
  'iSaveMoneyGo',
]);

const monthTokenMap: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const csvHeaders = [
  'monthId',
  'monthCurrencyCode',
  'monthlyLimit',
  'categoryName',
  'categoryPlanned',
  'categoryBucket',
  'categoryThemeId',
  'categoryRecurring',
  'categorySubcategories',
  'amount',
  'note',
  'transactionSubcategory',
  'happenedAt',
  'transactionRecurring',
  'transactionAccountName',
  'transactionAccountKinds',
  'transactionAccountCustomKinds',
] as const;

const normalizeBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }
  return fallback;
};

const normalizeNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const nextValue = Number(value.trim().replace(/[^0-9.-]/g, ''));
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

const parseRecentPreferenceCodes = <T extends string>(
  value: unknown,
  normalizeCode: (input: unknown) => T,
) => {
  if (typeof value !== 'string') {
    return [];
  }

  const uniqueCodes = new Set<T>();

  value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const normalized = normalizeCode(item);
      if (normalized) {
        uniqueCodes.add(normalized);
      }
    });

  return [...uniqueCodes].slice(0, 6);
};

const normalizeThemeId = (value: unknown, fallback: ThemeId): ThemeId =>
  typeof value === 'string' &&
  ['citrus', 'apricot', 'clay', 'sun', 'ember'].includes(value)
    ? (value as ThemeId)
    : fallback;

const normalizeAppThemeId = (value: unknown, fallback: AppThemeId = 'sunrise'): AppThemeId =>
  typeof value === 'string' && value in appThemes ? (value as AppThemeId) : fallback;

const escapeCsvCell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const buildCsv = (rows: string[][]) => rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');

const parseCsv = (source: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let index = 0;
  let inQuotes = false;

  while (index < source.length) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 2;
        continue;
      }

      inQuotes = !inQuotes;
      index += 1;
      continue;
    }

    if (!inQuotes && char === ',') {
      currentRow.push(currentCell);
      currentCell = '';
      index += 1;
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      index += 1;
      continue;
    }

    currentCell += char;
    index += 1;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
};

type ImportedMonth = {
  id: string;
  currencyCode: string;
  monthlyLimit: string;
  categoryMap: Map<string, Category>;
  transactions: Transaction[];
};

const ensureImportedAccount = (
  accounts: Map<string, BankAccount>,
  input: {
    name?: unknown;
    kinds?: unknown;
    customKinds?: unknown;
    kind?: unknown;
    importedId?: string;
  },
) => {
  const name = typeof input.name === 'string' ? input.name.trim() : '';

  if (!name) {
    return null;
  }

  const key = input.importedId || name.toLowerCase();
  const existing = accounts.get(key);
  if (existing) {
    return existing;
  }

  const customKinds = parseBankAccountCustomKinds(input.customKinds);

  const account: BankAccount = {
    id: createId('acct'),
    name,
    kinds: normalizeBankAccountKinds(
      input.kinds ?? input.kind,
      customKinds.length > 0 ? [] : [normalizeBankAccountKind(input.kind)],
    ),
    customKinds,
  };
  accounts.set(key, account);
  return account;
};

const ensureImportedMonth = (
  months: Map<string, ImportedMonth>,
  monthId: string,
  monthlyLimit: string,
  currencyCode: unknown = defaultCurrencyCode,
) => {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const existing = months.get(monthId);
  if (existing) {
    if (monthlyLimit && !existing.monthlyLimit) {
      existing.monthlyLimit = monthlyLimit;
    }
    if (!existing.currencyCode) {
      existing.currencyCode = normalizedCurrencyCode;
    }
    return existing;
  }

  const nextMonth: ImportedMonth = {
    id: monthId,
    currencyCode: normalizedCurrencyCode,
    monthlyLimit,
    categoryMap: new Map(),
    transactions: [],
  };
  months.set(monthId, nextMonth);
  return nextMonth;
};

const ensureImportedCategory = (
  month: ImportedMonth,
  input: {
    name: string;
    planned: number;
    subcategories?: unknown;
    bucket?: unknown;
    themeId?: unknown;
    recurring?: unknown;
    importedId?: string;
  },
) => {
  const key = input.importedId || input.name.trim().toLowerCase();
  const existing = month.categoryMap.get(key);
  if (existing) {
    return existing;
  }

  const category: Category = {
    id: createId('cat'),
    name: input.name.trim(),
    planned: input.planned > 0 ? input.planned : 0,
    subcategories: parseSubcategoryInput(input.subcategories),
    bucket:
      typeof input.bucket === 'string' && ['needs', 'wants', 'savings'].includes(input.bucket)
        ? (input.bucket as Category['bucket'])
        : inferCategoryBucket(input.name),
    themeId: normalizeThemeId(input.themeId, inferThemeId(input.name, month.categoryMap.size)),
    recurring: normalizeBoolean(input.recurring),
  };
  month.categoryMap.set(key, category);
  return category;
};

const finalizeImportedState = (
  months: Map<string, ImportedMonth>,
  accounts: Map<string, BankAccount>,
  goals: Goal[],
  preferences: AppPreferences,
  referenceDate: Date,
  requestedActiveMonthId?: string,
) => {
  const nextMonths: MonthRecord[] = [...months.values()]
    .map((month) => ({
      id: month.id,
      currencyCode: normalizeCurrencyCode(month.currencyCode, preferences.currencyCode),
      monthlyLimit:
        month.monthlyLimit ||
        String(
          [...month.categoryMap.values()].reduce((sum, category) => sum + category.planned, 0),
        ),
      categories: [...month.categoryMap.values()],
      transactions: month.transactions,
      updatedAt: Date.now(),
    }))
    .sort((left, right) => right.id.localeCompare(left.id));

  if (nextMonths.length === 0) {
    return null;
  }

  return normalizeBudgetAppState(
    {
      version: 5,
      activeMonthId: requestedActiveMonthId || nextMonths[0].id,
      months: nextMonths,
      accounts: [...accounts.values()],
      goals,
      preferences,
      updatedAt: Date.now(),
    },
    referenceDate,
  );
};

export const buildLedgerCsv = (appState: BudgetAppState) => {
  const rows: string[][] = [csvHeaders.map((header) => header)];

  appState.months.forEach((month) => {
    month.categories.forEach((category) => {
      const categoryTransactions = month.transactions.filter(
        (transaction) => transaction.categoryId === category.id,
      );

      if (categoryTransactions.length === 0) {
        rows.push([
          month.id,
          month.currencyCode,
          month.monthlyLimit,
          category.name,
          String(category.planned),
          category.bucket,
          category.themeId,
          String(category.recurring),
          category.subcategories.join(' | '),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
        return;
      }

      categoryTransactions.forEach((transaction) => {
        const account =
          transaction.accountId
            ? appState.accounts.find((entry) => entry.id === transaction.accountId) ?? null
            : null;
        rows.push([
          month.id,
          month.currencyCode,
          month.monthlyLimit,
          category.name,
          String(category.planned),
          category.bucket,
          category.themeId,
          String(category.recurring),
          category.subcategories.join(' | '),
          String(transaction.amount),
          transaction.note,
          transaction.subcategory ?? '',
          transaction.happenedAt,
          String(transaction.recurring),
          account?.name ?? '',
          account?.kinds.join('|') ?? '',
          account?.customKinds.join('|') ?? '',
        ]);
      });
    });
  });

  return buildCsv(rows);
};

export const importLedgerCsv = (csv: string, referenceDate = new Date()) => {
  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return null;
  }

  const header = rows[0];
  const columnIndex = Object.fromEntries(header.map((cell, index) => [cell.trim(), index]));
  const months = new Map<string, ImportedMonth>();
  const accounts = new Map<string, BankAccount>();

  rows.slice(1).forEach((row) => {
    const monthId = row[columnIndex.monthId] || getMonthId(referenceDate);
    const monthCurrencyCode =
      columnIndex.monthCurrencyCode !== undefined ? row[columnIndex.monthCurrencyCode] : defaultCurrencyCode;
    const monthlyLimit = row[columnIndex.monthlyLimit] || '0';
    const categoryName = row[columnIndex.categoryName]?.trim();
    const categorySubcategories =
      columnIndex.categorySubcategories !== undefined
        ? row[columnIndex.categorySubcategories]
        : undefined;

    if (!categoryName) {
      return;
    }

    const month = ensureImportedMonth(months, monthId, monthlyLimit, monthCurrencyCode);
    const category = ensureImportedCategory(month, {
      name: categoryName,
      planned: normalizeNumber(row[columnIndex.categoryPlanned]),
      subcategories: categorySubcategories,
      bucket: row[columnIndex.categoryBucket],
      themeId: row[columnIndex.categoryThemeId],
      recurring: row[columnIndex.categoryRecurring],
    });

    const amount = normalizeNumber(row[columnIndex.amount], NaN);
    const happenedAt = row[columnIndex.happenedAt];
    const account =
      columnIndex.transactionAccountName !== undefined
        ? ensureImportedAccount(accounts, {
            name: row[columnIndex.transactionAccountName],
            kinds:
              columnIndex.transactionAccountKinds !== undefined
                ? row[columnIndex.transactionAccountKinds]
                : columnIndex.transactionAccountKind !== undefined
                  ? row[columnIndex.transactionAccountKind]
                  : undefined,
            customKinds:
              columnIndex.transactionAccountCustomKinds !== undefined
                ? row[columnIndex.transactionAccountCustomKinds]
                : undefined,
          })
        : null;

    if (!Number.isFinite(amount) || amount <= 0 || !happenedAt) {
      return;
    }

    month.transactions.push({
      id: createId('txn'),
      categoryId: category.id,
      subcategory:
        columnIndex.transactionSubcategory !== undefined
          ? row[columnIndex.transactionSubcategory]?.trim() || undefined
          : undefined,
      accountId: account?.id,
      amount,
      note: row[columnIndex.note] || '',
      happenedAt,
      recurring: normalizeBoolean(row[columnIndex.transactionRecurring]),
    });
  });

  return finalizeImportedState(
    months,
    accounts,
    [],
    {
      appThemeId: 'sunrise',
      cloudBackupEnabled: false,
      currencyCode: defaultCurrencyCode,
      languageCode: defaultLanguageCode,
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    },
    referenceDate,
  );
};

export const buildWorkbookBase64 = (appState: BudgetAppState) => {
  const workbook = XLSX.utils.book_new();

  const summaryRows = appState.months.map((month) => ({
    monthId: month.id,
    monthLabel: getMonthLabel(month.id),
    currencyCode: month.currencyCode,
    monthlyLimit: month.monthlyLimit,
    planned: getTotalPlanned(month),
    spent: getTotalSpent(month),
    projectedSpend: Math.round(getProjectedSpend(month)),
  }));

  const monthRows = appState.months.map((month) => ({
    monthId: month.id,
    currencyCode: month.currencyCode,
    monthlyLimit: month.monthlyLimit,
  }));

  const categoryRows = appState.months.flatMap((month) =>
    month.categories.map((category) => ({
      monthId: month.id,
      id: category.id,
      name: category.name,
      planned: category.planned,
      subcategories: category.subcategories.join(' | '),
      bucket: category.bucket,
      themeId: category.themeId,
      recurring: category.recurring,
    })),
  );

  const transactionRows = appState.months.flatMap((month) =>
    month.transactions.map((transaction) => ({
      monthId: month.id,
      id: transaction.id,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId ?? '',
      accountName:
        appState.accounts.find((account) => account.id === transaction.accountId)?.name ?? '',
      accountKinds:
        appState.accounts.find((account) => account.id === transaction.accountId)?.kinds.join('|') ?? '',
      accountCustomKinds:
        appState.accounts.find((account) => account.id === transaction.accountId)?.customKinds.join('|') ?? '',
      amount: transaction.amount,
      note: transaction.note,
      subcategory: transaction.subcategory ?? '',
      happenedAt: transaction.happenedAt,
      recurring: transaction.recurring,
    })),
  );

  const accountRows = appState.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    kinds: account.kinds.join('|'),
    customKinds: account.customKinds.join('|'),
  }));

  const goalRows = appState.goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    target: goal.target,
    saved: goal.saved,
    themeId: goal.themeId,
  }));

  const preferenceRows = [
    {
      activeMonthId: appState.activeMonthId,
      appThemeId: appState.preferences.appThemeId,
      cloudBackupEnabled: appState.preferences.cloudBackupEnabled,
      currencyCode: appState.preferences.currencyCode,
      languageCode: appState.preferences.languageCode,
      recentCurrencyCodes: appState.preferences.recentCurrencyCodes.join('|'),
      recentLanguageCodes: appState.preferences.recentLanguageCodes.join('|'),
      updatedAt: appState.updatedAt,
    },
  ];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthRows), 'Months');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(accountRows), 'Accounts');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryRows), 'Categories');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows), 'Transactions');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(goalRows), 'Goals');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(preferenceRows), 'Preferences');

  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
};

export const importWorkbookBase64 = (base64: string, referenceDate = new Date()) => {
  const workbook = XLSX.read(base64, { type: 'base64' });
  const getSheetRows = (sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    return sheet
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      : [];
  };

  const monthRows = getSheetRows('Months');
  const accountRows = getSheetRows('Accounts');
  const categoryRows = getSheetRows('Categories');
  const transactionRows = getSheetRows('Transactions');

  if (monthRows.length === 0 && categoryRows.length === 0 && transactionRows.length === 0) {
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!firstSheet) {
      return null;
    }
    return importLedgerCsv(XLSX.utils.sheet_to_csv(firstSheet), referenceDate);
  }

  const months = new Map<string, ImportedMonth>();
  const accounts = new Map<string, BankAccount>();
  const categoryIdMap = new Map<string, string>();
  const accountIdMap = new Map<string, string>();

  monthRows.forEach((row) => {
    const monthId = typeof row.monthId === 'string' && row.monthId ? row.monthId : getMonthId(referenceDate);
    const monthlyLimit = typeof row.monthlyLimit === 'string' ? row.monthlyLimit : String(row.monthlyLimit || '0');
    ensureImportedMonth(months, monthId, monthlyLimit, row.currencyCode);
  });

  accountRows.forEach((row) => {
    const account = ensureImportedAccount(accounts, {
      name: row.name,
      kinds: row.kinds ?? row.kind,
      customKinds: row.customKinds,
      importedId: typeof row.id === 'string' ? row.id : undefined,
    });

    if (account && typeof row.id === 'string' && row.id) {
      accountIdMap.set(row.id, account.id);
    }
  });

  categoryRows.forEach((row) => {
    const monthId = typeof row.monthId === 'string' && row.monthId ? row.monthId : getMonthId(referenceDate);
    const month = ensureImportedMonth(
      months,
      monthId,
      typeof row.monthlyLimit === 'string' ? row.monthlyLimit : '0',
      row.currencyCode,
    );
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) {
      return;
    }
    const category = ensureImportedCategory(month, {
      name,
      planned: normalizeNumber(row.planned),
      subcategories: row.subcategories,
      bucket: row.bucket,
      themeId: row.themeId,
      recurring: row.recurring,
      importedId: typeof row.id === 'string' ? row.id : undefined,
    });

    if (typeof row.id === 'string' && row.id) {
      categoryIdMap.set(`${monthId}:${row.id}`, category.id);
    }
  });

  transactionRows.forEach((row) => {
    const monthId = typeof row.monthId === 'string' && row.monthId ? row.monthId : getMonthId(referenceDate);
    const month = ensureImportedMonth(months, monthId, '0', row.currencyCode);
    const amount = normalizeNumber(row.amount, NaN);
    const happenedAt = typeof row.happenedAt === 'string' ? row.happenedAt : '';

    if (!Number.isFinite(amount) || amount <= 0 || !happenedAt) {
      return;
    }

    let categoryId =
      typeof row.categoryId === 'string' && row.categoryId
        ? categoryIdMap.get(`${monthId}:${row.categoryId}`)
        : undefined;
    const accountId =
      typeof row.accountId === 'string' && row.accountId
        ? accountIdMap.get(row.accountId)
        : ensureImportedAccount(accounts, {
            name: row.accountName,
            kinds: row.accountKinds ?? row.accountKind,
            customKinds: row.accountCustomKinds,
          })?.id;

    if (!categoryId) {
      const fallbackCategory = ensureImportedCategory(month, {
        name: typeof row.categoryName === 'string' && row.categoryName ? row.categoryName : 'Imported',
        planned: 0,
        bucket: row.bucket,
        themeId: row.themeId,
        recurring: row.recurring,
      });
      categoryId = fallbackCategory.id;
    }

    month.transactions.push({
      id: typeof row.id === 'string' && row.id ? row.id : createId('txn'),
      categoryId,
      subcategory:
        typeof row.subcategory === 'string' && row.subcategory.trim()
          ? row.subcategory.trim()
          : undefined,
      accountId,
      amount,
      note: typeof row.note === 'string' ? row.note : '',
      happenedAt,
      recurring: normalizeBoolean(row.recurring),
    });
  });

  const goalRows = getSheetRows('Goals');
  const goals: Goal[] = goalRows
    .map((row, index) => {
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const target = normalizeNumber(row.target);
      const saved = normalizeNumber(row.saved);

      if (!name || target <= 0 || saved < 0) {
        return null;
      }

      return {
        id: typeof row.id === 'string' && row.id ? row.id : createId(`goal-${index}`),
        name,
        target,
        saved,
        themeId: normalizeThemeId(row.themeId, inferThemeId(name, index)),
      } satisfies Goal;
    })
    .filter((goal): goal is Goal => goal !== null);

  const preferencesRow = getSheetRows('Preferences')[0];
  const activeMonthId =
    preferencesRow && typeof preferencesRow.activeMonthId === 'string'
      ? preferencesRow.activeMonthId
      : undefined;
  const appThemeId = preferencesRow ? normalizeAppThemeId(preferencesRow.appThemeId) : 'sunrise';
  const cloudBackupEnabled =
    preferencesRow && typeof preferencesRow.cloudBackupEnabled === 'boolean'
      ? preferencesRow.cloudBackupEnabled
      : false;
  const currencyCode = preferencesRow
    ? normalizeCurrencyCode(preferencesRow.currencyCode)
    : defaultCurrencyCode;
  const languageCode = preferencesRow
    ? normalizeLanguageCode(preferencesRow.languageCode)
    : defaultLanguageCode;
  const recentCurrencyCodes = preferencesRow
    ? parseRecentPreferenceCodes(preferencesRow.recentCurrencyCodes, normalizeCurrencyCode)
    : [];
  const recentLanguageCodes = preferencesRow
    ? parseRecentPreferenceCodes(preferencesRow.recentLanguageCodes, normalizeLanguageCode)
    : [];

  return finalizeImportedState(
    months,
    accounts,
    goals,
    {
      appThemeId,
      cloudBackupEnabled,
      currencyCode,
      languageCode,
      recentCurrencyCodes,
      recentLanguageCodes,
    },
    referenceDate,
    activeMonthId,
  );
};

const normalizePdfLine = (line: string) => line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const normalizePdfLines = (source: string) =>
  source
    .split(/\r?\n/)
    .map(normalizePdfLine)
    .filter(Boolean);

const isPdfDateLine = (line: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(line);
const isPdfAmountLine = (line: string) => /^-?\d+(?:\.\d{2})$/.test(line);
const isPdfFooterLine = (line: string) =>
  pdfIgnoredLines.has(line) || line.startsWith('From ') || line === ISAVE_MONEY_MARKER;

const canonicalPdfText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const squashPdfText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
const joinPdfLabel = (lines: string[]) => lines.map(normalizePdfLine).join(' ').replace(/\s+/g, ' ').trim();

const parsePdfDateToMonthId = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, monthText, , yearText] = match;
  return `${yearText}-${monthText}`;
};

const parsePdfDateToIso = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, monthText, dayText, yearText] = match;
  const date = new Date(Number(yearText), Number(monthText) - 1, Number(dayText), 12, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const collectPdfAmountBlock = (lines: string[], startIndex: number) => {
  const values: number[] = [];
  let index = startIndex;

  while (index < lines.length && isPdfAmountLine(lines[index])) {
    values.push(normalizeNumber(lines[index], NaN));
    index += 1;
  }

  return {
    values: values.filter((value) => Number.isFinite(value)),
    nextIndex: index,
  };
};

const buildPdfTransactionNote = (sectionName: string, labelLines: string[]) => {
  if (labelLines.length === 0) {
    return sectionName;
  }

  const fullLabel = joinPdfLabel(labelLines);
  const sectionSquashed = squashPdfText(sectionName);
  const labelSquashed = squashPdfText(fullLabel);

  if (!fullLabel || labelSquashed === sectionSquashed) {
    return sectionName;
  }

  if (labelLines.length > 1 && squashPdfText(labelLines[0]) === sectionSquashed) {
    const nextLabel = joinPdfLabel(labelLines.slice(1));
    return nextLabel || sectionName;
  }

  const normalizedSection = canonicalPdfText(sectionName);
  const normalizedLabel = canonicalPdfText(fullLabel);

  if (normalizedLabel.startsWith(`${normalizedSection} `)) {
    return fullLabel.slice(sectionName.length).trim() || sectionName;
  }

  return fullLabel;
};

const inferReportMonthId = (title: string, lines: string[], referenceDate: Date) => {
  const normalizedTitle = canonicalPdfText(title);
  const tokenMatch = normalizedTitle.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/,
  );

  const yearMatch =
    title.match(/(20\d{2})/) ??
    lines.join(' ').match(/(?:\d{2}\/\d{2}\/)(20\d{2})/);

  if (tokenMatch) {
    const month = monthTokenMap[tokenMatch[1]];
    const year = yearMatch ? Number(yearMatch[1]) : referenceDate.getFullYear();

    if (month && Number.isFinite(year)) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }

  const allDateMatches = lines
    .flatMap((line) => line.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [])
    .map((dateText) => parsePdfDateToMonthId(dateText))
    .filter((monthId): monthId is string => Boolean(monthId));

  if (allDateMatches.length > 0) {
    const frequency = new Map<string, number>();

    allDateMatches.forEach((monthId) => {
      frequency.set(monthId, (frequency.get(monthId) ?? 0) + 1);
    });

    return [...frequency.entries()].sort((left, right) => right[1] - left[1])[0][0];
  }

  return getMonthId(referenceDate);
};

const looksLikeNextPdfSection = (lines: string[], startIndex: number) => {
  let index = startIndex;
  const labelLines: string[] = [];

  while (index < lines.length) {
    const line = lines[index];

    if (isPdfFooterLine(line)) {
      index += 1;
      continue;
    }

    if (isPdfDateLine(line)) {
      return false;
    }

    if (isPdfAmountLine(line)) {
      const label = joinPdfLabel(labelLines);
      return (
        labelLines.length > 0 &&
        (label === 'Saving' || label === 'Total Expenditure' || collectPdfAmountBlock(lines, index).values.length >= 2)
      );
    }

    labelLines.push(line);
    index += 1;
  }

  return false;
};

type ParsedPdfTransaction = {
  happenedAt: string;
  monthId: string;
  note: string;
  amount: number;
};

type ParsedPdfSection = {
  name: string;
  planned: number;
  transactions: ParsedPdfTransaction[];
};

export const importISaveMoneyPdfText = (text: string, referenceDate = new Date()) => {
  const normalizedText = text.replace(/\u00a0/g, ' ');

  if (!normalizedText.includes('Expenditures') || !normalizedText.includes(ISAVE_MONEY_MARKER)) {
    return null;
  }

  const lines = normalizePdfLines(normalizedText);
  const reportTitle = lines[0] ?? '';
  const reportMonthId = inferReportMonthId(reportTitle, lines, referenceDate);
  const expendituresIndex = lines.findIndex((line) => line === 'Expenditures');

  if (expendituresIndex === -1) {
    return null;
  }

  const sections: ParsedPdfSection[] = [];
  let index = expendituresIndex + 1;

  while (index < lines.length) {
    while (index < lines.length && isPdfFooterLine(lines[index])) {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    if (isPdfDateLine(lines[index]) || isPdfAmountLine(lines[index])) {
      index += 1;
      continue;
    }

    const labelLines: string[] = [];

    while (index < lines.length) {
      const line = lines[index];

      if (isPdfFooterLine(line)) {
        index += 1;
        continue;
      }

      if (isPdfDateLine(line) || isPdfAmountLine(line)) {
        break;
      }

      labelLines.push(line);
      index += 1;
    }

    const sectionName = joinPdfLabel(labelLines);
    if (!sectionName) {
      continue;
    }

    if (sectionName === 'Saving' || sectionName === 'Total Expenditure') {
      break;
    }

    const amountBlock = collectPdfAmountBlock(lines, index);
    if (amountBlock.values.length < 2) {
      continue;
    }

    const sectionPlanned = amountBlock.values[1];
    index = amountBlock.nextIndex;

    const transactions: ParsedPdfTransaction[] = [];

    while (index < lines.length) {
      while (index < lines.length && isPdfFooterLine(lines[index])) {
        index += 1;
      }

      if (index >= lines.length || looksLikeNextPdfSection(lines, index)) {
        break;
      }

      if (!isPdfDateLine(lines[index])) {
        index += 1;
        continue;
      }

      const dateText = lines[index];
      index += 1;

      const transactionLabelLines: string[] = [];
      while (
        index < lines.length &&
        !isPdfFooterLine(lines[index]) &&
        !isPdfDateLine(lines[index]) &&
        !isPdfAmountLine(lines[index])
      ) {
        transactionLabelLines.push(lines[index]);
        index += 1;
      }

      while (index < lines.length && isPdfFooterLine(lines[index])) {
        index += 1;
      }

      const transactionAmounts = collectPdfAmountBlock(lines, index);
      if (transactionAmounts.values.length === 0) {
        continue;
      }

      index = transactionAmounts.nextIndex;
      const happenedAt = parsePdfDateToIso(dateText);
      const monthId = parsePdfDateToMonthId(dateText);

      if (!happenedAt || !monthId) {
        continue;
      }

      transactions.push({
        happenedAt,
        monthId,
        note: buildPdfTransactionNote(sectionName, transactionLabelLines),
        amount: transactionAmounts.values[0],
      });
    }

    sections.push({
      name: sectionName,
      planned: sectionPlanned,
      transactions,
    });
  }

  if (sections.length === 0) {
    return null;
  }

  const months = new Map<string, ImportedMonth>();

  sections.forEach((section, sectionIndex) => {
    if (section.transactions.length === 0) {
      const month = ensureImportedMonth(months, reportMonthId, '0');
      ensureImportedCategory(month, {
        name: section.name,
        planned: section.planned,
        themeId: inferThemeId(section.name, sectionIndex),
        recurring: false,
      });
      return;
    }

    const transactionGroups = new Map<string, ParsedPdfTransaction[]>();
    section.transactions.forEach((transaction) => {
      const existing = transactionGroups.get(transaction.monthId) ?? [];
      existing.push(transaction);
      transactionGroups.set(transaction.monthId, existing);
    });

    const spansMultipleMonths = transactionGroups.size > 1;

    transactionGroups.forEach((groupTransactions, monthId) => {
      const month = ensureImportedMonth(months, monthId, '0');
      const planned = spansMultipleMonths
        ? groupTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
        : section.planned || groupTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const category = ensureImportedCategory(month, {
        name: section.name,
        planned,
        themeId: inferThemeId(section.name, sectionIndex),
        recurring: false,
      });

      groupTransactions.forEach((transaction) => {
        month.transactions.push({
          id: createId('txn'),
          categoryId: category.id,
          amount: transaction.amount,
          note: transaction.note,
          happenedAt: transaction.happenedAt,
          recurring: false,
        });
      });
    });
  });

  return finalizeImportedState(
    months,
    new Map<string, BankAccount>(),
    [],
    {
      appThemeId: 'sunrise',
      cloudBackupEnabled: false,
      currencyCode: defaultCurrencyCode,
      languageCode: defaultLanguageCode,
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    },
    referenceDate,
    reportMonthId,
  );
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildBudgetPdfHtml = (appState: BudgetAppState, month: MonthRecord) => {
  const summaries = getCategorySummaries(month);
  const totalSpent = getTotalSpent(month);
  const totalPlanned = getTotalPlanned(month);
  const progress = totalPlanned > 0 ? Math.round(clamp(totalSpent / totalPlanned) * 100) : 0;
  const projectedSpend = Math.round(getProjectedSpend(month));
  const topGoal = appState.goals[0];
  const currencyCode = month.currencyCode;
  const localeTag = getLocaleTag(appState.preferences.languageCode);

  const categoryRows = summaries
    .map(
      (summary) => `
        <tr>
          <td>${escapeHtml(summary.category.name)}</td>
          <td>${currency(summary.category.planned, currencyCode, localeTag)}</td>
          <td>${currency(summary.spent, currencyCode, localeTag)}</td>
          <td>${currency(summary.left, currencyCode, localeTag)}</td>
        </tr>`,
    )
    .join('');

  const transactionRows = month.transactions
    .slice(0, 12)
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(
            transaction.note ||
              transaction.subcategory ||
              month.categories.find((category) => category.id === transaction.categoryId)?.name ||
              'Expense',
          )}</td>
          <td>${escapeHtml(transaction.happenedAt.slice(0, 10))}</td>
          <td>${currency(transaction.amount, currencyCode, localeTag)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { margin: 24px; }
      body { font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; color: #243531; }
      .hero { background: #1f6862; color: #f5fffd; border-radius: 24px; padding: 24px; margin-bottom: 24px; }
      .grid { display: table; width: 100%; table-layout: fixed; margin: 16px 0 0; }
      .cell { display: table-cell; padding-right: 12px; vertical-align: top; }
      .metric { background: #edf7f5; border-radius: 18px; padding: 14px; color: #184741; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      h2 { font-size: 20px; margin: 28px 0 12px; color: #184741; }
      p { margin: 0; line-height: 1.5; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px 0; border-bottom: 1px solid #d7e7e4; text-align: left; font-size: 13px; }
      th { color: #607f7a; font-weight: 600; }
      .footer { margin-top: 28px; color: #607f7a; font-size: 12px; }
    </style>
  </head>
  <body>
    <section class="hero">
      <h1>Budget report for ${escapeHtml(getMonthLabel(month.id, localeTag))}</h1>
      <p>Planned ${currency(totalPlanned, currencyCode, localeTag)}. Spent ${currency(totalSpent, currencyCode, localeTag)}. ${progress}% of plan used.</p>
      <div class="grid">
        <div class="cell"><div class="metric"><strong>Forecast</strong><br />${currency(projectedSpend, currencyCode, localeTag)}</div></div>
        <div class="cell"><div class="metric"><strong>Transactions</strong><br />${month.transactions.length}</div></div>
        <div class="cell"><div class="metric"><strong>Top goal</strong><br />${escapeHtml(topGoal?.name || 'No goal yet')}</div></div>
      </div>
    </section>

    <h2>Categories</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Planned</th><th>Spent</th><th>Left</th></tr>
      </thead>
      <tbody>${categoryRows}</tbody>
    </table>

    <h2>Recent transactions</h2>
    <table>
      <thead>
        <tr><th>Note</th><th>Date</th><th>Amount</th></tr>
      </thead>
      <tbody>${transactionRows || '<tr><td colspan="3">No transactions yet.</td></tr>'}</tbody>
    </table>

    <p class="footer">Generated by Budget Buddy on ${escapeHtml(new Date().toLocaleDateString(localeTag))}.</p>
  </body>
</html>`;
};

export const buildImportableBudgetPdfBase64 = async (
  pdfBase64: string,
  appState: BudgetAppState,
  month: MonthRecord,
) => {
  const pdfDoc = await PDFDocument.load(pdfBase64);
  pdfDoc.setTitle(
    `Budget report for ${getMonthLabel(month.id, getLocaleTag(appState.preferences.languageCode))}`,
  );
  pdfDoc.setAuthor('Budget Buddy');
  pdfDoc.setCreator('Budget Buddy');
  pdfDoc.setProducer('Budget Buddy');
  pdfDoc.setKeywords(['budget-buddy', 'importable-pdf', `month:${month.id}`]);
  pdfDoc.setSubject(`${PDF_IMPORT_MARKER}${JSON.stringify(appState)}`);
  pdfDoc.setModificationDate(new Date());
  return pdfDoc.saveAsBase64();
};

export const importBudgetPdfBase64 = async (pdfBase64: string, referenceDate = new Date()) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBase64, { updateMetadata: false });
    const subject = pdfDoc.getSubject()?.trim() ?? '';

    if (!subject.startsWith(PDF_IMPORT_MARKER)) {
      return null;
    }

    const payload = subject.slice(PDF_IMPORT_MARKER.length);
    if (!payload) {
      return null;
    }

    return normalizeBudgetAppState(JSON.parse(payload), referenceDate);
  } catch {
    return null;
  }
};

export const createImportedTransactionDate = (monthId: string, value: unknown) => {
  if (typeof value === 'string' && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return buildIsoDateForMonth(monthId, 1);
};
