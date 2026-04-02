export type ThemeId = 'citrus' | 'apricot' | 'clay' | 'sun' | 'ember';
export type AppThemeId = 'sunrise' | 'lagoon' | 'meadow' | 'blush';
export type CurrencyCode = string;
export type LanguageCode = string;
export type BudgetTone = 'good' | 'warning' | 'alert';
export type MonthlyLimit = string;
export type CategoryBucket = 'needs' | 'wants' | 'savings';

export type AppTheme = {
  id: AppThemeId;
  name: string;
  description: string;
  background: string;
  orbPrimary: string;
  orbSecondary: string;
  orbTertiary: string;
  hero: string;
  heroShadow: string;
  heroChip: string;
  heroChipText: string;
  heroStatusGood: string;
  heroStatusAlert: string;
  heroStatusGoodText: string;
  heroStatusAlertText: string;
  heroText: string;
  heroMuted: string;
  heroPanel: string;
  heroPanelSoft: string;
  surface: string;
  surfaceSoft: string;
  surfaceTint: string;
  surfaceMuted: string;
  surfaceStrong: string;
  text: string;
  textMuted: string;
  textSoft: string;
  placeholder: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  accentBorder: string;
  progressTrack: string;
  progressGood: string;
  progressWarning: string;
  progressAlert: string;
  successSurface: string;
  successText: string;
  warningSurface: string;
  warningText: string;
  alertSurface: string;
  alertText: string;
  divider: string;
  shadow: string;
  switchOff: string;
  switchOn: string;
  switchThumbOn: string;
  switchThumbOff: string;
};

export type Category = {
  id: string;
  name: string;
  planned: number;
  subcategories: string[];
  bucket: CategoryBucket;
  themeId: ThemeId;
  recurring: boolean;
};

export type BankAccountKind = 'spending' | 'recurring' | 'savings' | 'investing';

export type BankAccount = {
  id: string;
  name: string;
  kinds: BankAccountKind[];
  customKinds: string[];
};

export type Transaction = {
  id: string;
  categoryId: string;
  accountId?: string;
  amount: number;
  note: string;
  happenedAt: string;
  recurring: boolean;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  themeId: ThemeId;
};

export type MonthRecord = {
  id: string;
  currencyCode: CurrencyCode;
  monthlyLimit: MonthlyLimit;
  categories: Category[];
  transactions: Transaction[];
  updatedAt: number;
};

export type AppPreferences = {
  appThemeId: AppThemeId;
  currencyCode: CurrencyCode;
  languageCode: LanguageCode;
  recentCurrencyCodes: CurrencyCode[];
  recentLanguageCodes: LanguageCode[];
};

export type BudgetAppState = {
  version: 4;
  activeMonthId: string;
  months: MonthRecord[];
  accounts: BankAccount[];
  goals: Goal[];
  preferences: AppPreferences;
  updatedAt: number;
};

export type QuickPreset = {
  name: string;
  planned: number;
  bucket: CategoryBucket;
  themeId: ThemeId;
  recurring: boolean;
};

export const categoryBucketOrder: CategoryBucket[] = ['needs', 'wants', 'savings'];
export const bankAccountKindOrder: BankAccountKind[] = ['spending', 'recurring', 'savings', 'investing'];
export const bankAccountKindMeta: Record<
  BankAccountKind,
  {
    label: string;
    description: string;
  }
> = {
  spending: {
    label: 'Spending',
    description: 'Day-to-day account for routine expenses and flexible spending.',
  },
  recurring: {
    label: 'Recurring',
    description: 'Main account used for rent, bills, subscriptions, and scheduled commitments.',
  },
  savings: {
    label: 'Savings',
    description: 'Savings or investing account used for transfers, pockets, and reserves.',
  },
  investing: {
    label: 'Investing',
    description: 'Brokerage or investment activity linked to this account.',
  },
};

export const categoryBucketMeta: Record<
  CategoryBucket,
  {
    label: string;
    description: string;
  }
> = {
  needs: {
    label: 'Needs',
    description: 'Rent, bills, groceries, transport, and other core spending.',
  },
  wants: {
    label: 'Wants',
    description: 'Lifestyle, subscriptions, dining, shopping, and flexible spend.',
  },
  savings: {
    label: 'Savings',
    description: 'Emergency fund, debt payoff, investing, and future goals.',
  },
};

export type CategorySummary = {
  category: Category;
  spent: number;
  left: number;
  ratio: number;
  tone: BudgetTone;
  thisWeek: number;
  transactions: Transaction[];
};

export const LOCAL_STORAGE_KEY = 'budget-buddy:app-state:v2';
export const LEGACY_STORAGE_KEY = 'budget-buddy:dashboard-state:v1';
export const getUserStorageKey = (userId: string) => `${LOCAL_STORAGE_KEY}:user:${userId}`;
export const defaultCurrencyCode: CurrencyCode = 'USD';
export const defaultLanguageCode: LanguageCode = 'en';

export const currencyOptions: Array<{
  code: CurrencyCode;
  label: string;
  description: string;
  locale: string;
}> = [
  { code: 'USD', label: 'US Dollar', description: '$ USD', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', description: 'EUR', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound', description: 'GBP', locale: 'en-GB' },
  { code: 'INR', label: 'Indian Rupee', description: 'INR', locale: 'en-IN' },
  { code: 'CAD', label: 'Canadian Dollar', description: 'CAD', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian Dollar', description: 'AUD', locale: 'en-AU' },
  { code: 'JPY', label: 'Japanese Yen', description: 'JPY', locale: 'ja-JP' },
  { code: 'CHF', label: 'Swiss Franc', description: 'CHF', locale: 'de-CH' },
  { code: 'AED', label: 'UAE Dirham', description: 'AED', locale: 'ar-AE' },
  { code: 'ARS', label: 'Argentine Peso', description: 'ARS', locale: 'es-AR' },
  { code: 'BBD', label: 'Barbadian Dollar', description: 'BBD', locale: 'en-BB' },
  { code: 'BDT', label: 'Bangladeshi Taka', description: 'BDT', locale: 'bn-BD' },
  { code: 'BGN', label: 'Bulgarian Lev', description: 'BGN', locale: 'bg-BG' },
  { code: 'BHD', label: 'Bahraini Dinar', description: 'BHD', locale: 'ar-BH' },
  { code: 'BRL', label: 'Brazilian Real', description: 'BRL', locale: 'pt-BR' },
  { code: 'CLP', label: 'Chilean Peso', description: 'CLP', locale: 'es-CL' },
  { code: 'CNY', label: 'Chinese Yuan', description: 'CNY', locale: 'zh-CN' },
  { code: 'COP', label: 'Colombian Peso', description: 'COP', locale: 'es-CO' },
  { code: 'CZK', label: 'Czech Koruna', description: 'CZK', locale: 'cs-CZ' },
  { code: 'DKK', label: 'Danish Krone', description: 'DKK', locale: 'da-DK' },
  { code: 'DZD', label: 'Algerian Dinar', description: 'DZD', locale: 'ar-DZ' },
  { code: 'EGP', label: 'Egyptian Pound', description: 'EGP', locale: 'ar-EG' },
  { code: 'GHS', label: 'Ghanaian Cedi', description: 'GHS', locale: 'en-GH' },
  { code: 'HKD', label: 'Hong Kong Dollar', description: 'HKD', locale: 'zh-HK' },
  { code: 'HUF', label: 'Hungarian Forint', description: 'HUF', locale: 'hu-HU' },
  { code: 'IDR', label: 'Indonesian Rupiah', description: 'IDR', locale: 'id-ID' },
  { code: 'ILS', label: 'Israeli New Shekel', description: 'ILS', locale: 'he-IL' },
  { code: 'KES', label: 'Kenyan Shilling', description: 'KES', locale: 'en-KE' },
  { code: 'KRW', label: 'South Korean Won', description: 'KRW', locale: 'ko-KR' },
  { code: 'KWD', label: 'Kuwaiti Dinar', description: 'KWD', locale: 'ar-KW' },
  { code: 'LKR', label: 'Sri Lankan Rupee', description: 'LKR', locale: 'si-LK' },
  { code: 'MAD', label: 'Moroccan Dirham', description: 'MAD', locale: 'fr-MA' },
  { code: 'MXN', label: 'Mexican Peso', description: 'MXN', locale: 'es-MX' },
  { code: 'MYR', label: 'Malaysian Ringgit', description: 'MYR', locale: 'ms-MY' },
  { code: 'NGN', label: 'Nigerian Naira', description: 'NGN', locale: 'en-NG' },
  { code: 'NOK', label: 'Norwegian Krone', description: 'NOK', locale: 'nb-NO' },
  { code: 'NPR', label: 'Nepalese Rupee', description: 'NPR', locale: 'ne-NP' },
  { code: 'NZD', label: 'New Zealand Dollar', description: 'NZD', locale: 'en-NZ' },
  { code: 'OMR', label: 'Omani Rial', description: 'OMR', locale: 'ar-OM' },
  { code: 'PEN', label: 'Peruvian Sol', description: 'PEN', locale: 'es-PE' },
  { code: 'PHP', label: 'Philippine Peso', description: 'PHP', locale: 'en-PH' },
  { code: 'PKR', label: 'Pakistani Rupee', description: 'PKR', locale: 'ur-PK' },
  { code: 'PLN', label: 'Polish Zloty', description: 'PLN', locale: 'pl-PL' },
  { code: 'QAR', label: 'Qatari Riyal', description: 'QAR', locale: 'ar-QA' },
  { code: 'RON', label: 'Romanian Leu', description: 'RON', locale: 'ro-RO' },
  { code: 'SAR', label: 'Saudi Riyal', description: 'SAR', locale: 'ar-SA' },
  { code: 'SEK', label: 'Swedish Krona', description: 'SEK', locale: 'sv-SE' },
  { code: 'SGD', label: 'Singapore Dollar', description: 'SGD', locale: 'en-SG' },
  { code: 'THB', label: 'Thai Baht', description: 'THB', locale: 'th-TH' },
  { code: 'TRY', label: 'Turkish Lira', description: 'TRY', locale: 'tr-TR' },
  { code: 'TWD', label: 'New Taiwan Dollar', description: 'TWD', locale: 'zh-TW' },
  { code: 'UAH', label: 'Ukrainian Hryvnia', description: 'UAH', locale: 'uk-UA' },
  { code: 'VND', label: 'Vietnamese Dong', description: 'VND', locale: 'vi-VN' },
  { code: 'ZAR', label: 'South African Rand', description: 'ZAR', locale: 'en-ZA' },
];

export const languageOptions: Array<{ code: LanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'da', label: 'Danish' },
  { code: 'es', label: 'Spanish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'he', label: 'Hebrew' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ms', label: 'Malay' },
  { code: 'nb', label: 'Norwegian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian' },
  { code: 'sv', label: 'Swedish' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'zh', label: 'Chinese' },
];

const currencyLocaleMap = Object.fromEntries(
  currencyOptions.map((option) => [option.code, option.locale]),
) as Record<CurrencyCode, string>;

const languageLocaleMap: Record<string, string> = {
  ar: 'ar-SA',
  bn: 'bn-BD',
  da: 'da-DK',
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fi: 'fi-FI',
  fr: 'fr-FR',
  he: 'he-IL',
  hi: 'hi-IN',
  id: 'id-ID',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ms: 'ms-MY',
  nb: 'nb-NO',
  nl: 'nl-NL',
  pl: 'pl-PL',
  pt: 'pt-PT',
  ro: 'ro-RO',
  ru: 'ru-RU',
  sv: 'sv-SE',
  th: 'th-TH',
  tr: 'tr-TR',
  uk: 'uk-UA',
  ur: 'ur-PK',
  vi: 'vi-VN',
  zh: 'zh-CN',
};

export const featuredCurrencyCodes: CurrencyCode[] = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'CNY',
  'SGD',
];

export const featuredLanguageCodes: LanguageCode[] = [
  'en',
  'fr',
  'nl',
  'de',
  'es',
  'pt',
  'hi',
  'ja',
  'zh',
  'ar',
];

export const appThemes: Record<AppThemeId, AppTheme> = {
  sunrise: {
    id: 'sunrise',
    name: 'Clementine',
    description: 'Burnt orange with softer paper tones.',
    background: '#FBF3EB',
    orbPrimary: '#F2D4BF',
    orbSecondary: '#F7E6D7',
    orbTertiary: '#EED4C5',
    hero: '#B95E2F',
    heroShadow: '#6F3818',
    heroChip: 'rgba(255,255,255,0.14)',
    heroChipText: '#FFF7F0',
    heroStatusGood: '#FCE6D7',
    heroStatusAlert: '#FFF1EA',
    heroStatusGoodText: '#8E4821',
    heroStatusAlertText: '#A64B3C',
    heroText: '#FFF9F5',
    heroMuted: '#F7E2D0',
    heroPanel: '#FFF9F4',
    heroPanelSoft: '#FDECDD',
    surface: 'rgba(255,255,255,0.94)',
    surfaceSoft: '#F8EFE6',
    surfaceTint: '#F7E8D8',
    surfaceMuted: '#FAF3EC',
    surfaceStrong: '#F5E8DB',
    text: '#6F3A1E',
    textMuted: '#93664A',
    textSoft: '#9A755E',
    placeholder: '#A18370',
    accent: '#DB7A31',
    accentSoft: '#EAB084',
    accentText: '#8B4A22',
    accentBorder: '#DB7A31',
    progressTrack: '#EFD5C0',
    progressGood: '#DB7A31',
    progressWarning: '#E0AB5B',
    progressAlert: '#E76F51',
    successSurface: '#F8E7D7',
    successText: '#8B4A22',
    warningSurface: '#FFF3DB',
    warningText: '#9C6120',
    alertSurface: '#FFE6DF',
    alertText: '#AF4A39',
    divider: '#E8D8CA',
    shadow: '#A58973',
    switchOff: '#E4D3C6',
    switchOn: '#EAB084',
    switchThumbOn: '#DB7A31',
    switchThumbOff: '#FFFFFF',
  },
  lagoon: {
    id: 'lagoon',
    name: 'Harbor',
    description: 'Deep teal with sea-glass restraint.',
    background: '#EEF7F6',
    orbPrimary: '#BFDCD9',
    orbSecondary: '#DCEFED',
    orbTertiary: '#C4DDDA',
    hero: '#1F6862',
    heroShadow: '#123F3C',
    heroChip: 'rgba(255,255,255,0.15)',
    heroChipText: '#F1FFFC',
    heroStatusGood: '#DCEFEB',
    heroStatusAlert: '#FFF1EA',
    heroStatusGoodText: '#1A5751',
    heroStatusAlertText: '#AF4A39',
    heroText: '#F5FFFD',
    heroMuted: '#D4EBE8',
    heroPanel: '#F7FFFD',
    heroPanelSoft: '#E3F1EF',
    surface: 'rgba(255,255,255,0.94)',
    surfaceSoft: '#EDF7F5',
    surfaceTint: '#E1F0EE',
    surfaceMuted: '#F3FBFA',
    surfaceStrong: '#E7F3F1',
    text: '#184741',
    textMuted: '#607F7A',
    textSoft: '#70908A',
    placeholder: '#728F8A',
    accent: '#2F9588',
    accentSoft: '#7BC4B8',
    accentText: '#1D6159',
    accentBorder: '#2F9588',
    progressTrack: '#CEE4E1',
    progressGood: '#2F9588',
    progressWarning: '#D8A856',
    progressAlert: '#E76F51',
    successSurface: '#E1F0EE',
    successText: '#1D6159',
    warningSurface: '#FFF3DB',
    warningText: '#9C6120',
    alertSurface: '#FFE6DF',
    alertText: '#AF4A39',
    divider: '#D7E7E4',
    shadow: '#87A5A0',
    switchOff: '#D0E1DE',
    switchOn: '#97D0C8',
    switchThumbOn: '#2F9588',
    switchThumbOff: '#FFFFFF',
  },
  meadow: {
    id: 'meadow',
    name: 'Olive',
    description: 'Muted sage with grounded contrast.',
    background: '#F3F6EE',
    orbPrimary: '#D5DFC8',
    orbSecondary: '#E6ECD9',
    orbTertiary: '#D6DDCB',
    hero: '#5A7350',
    heroShadow: '#394831',
    heroChip: 'rgba(255,255,255,0.15)',
    heroChipText: '#F7FBF4',
    heroStatusGood: '#E7EEE0',
    heroStatusAlert: '#FFF1EA',
    heroStatusGoodText: '#4D6544',
    heroStatusAlertText: '#AF4A39',
    heroText: '#F8FBF5',
    heroMuted: '#DFE8D7',
    heroPanel: '#F9FBF6',
    heroPanelSoft: '#EBF0E3',
    surface: 'rgba(255,255,255,0.94)',
    surfaceSoft: '#F1F5EB',
    surfaceTint: '#E6ECDE',
    surfaceMuted: '#F6F8F2',
    surfaceStrong: '#EBF0E4',
    text: '#465540',
    textMuted: '#6F7E69',
    textSoft: '#7D8C76',
    placeholder: '#7F8C79',
    accent: '#738B5B',
    accentSoft: '#AFC09C',
    accentText: '#536748',
    accentBorder: '#738B5B',
    progressTrack: '#D5DECC',
    progressGood: '#738B5B',
    progressWarning: '#C0A356',
    progressAlert: '#E76F51',
    successSurface: '#E7EEE0',
    successText: '#536748',
    warningSurface: '#FFF3DB',
    warningText: '#9C6120',
    alertSurface: '#FFE6DF',
    alertText: '#AF4A39',
    divider: '#DEE5D6',
    shadow: '#99A68F',
    switchOff: '#D8E0D1',
    switchOn: '#B9C8A9',
    switchThumbOn: '#738B5B',
    switchThumbOff: '#FFFFFF',
  },
  blush: {
    id: 'blush',
    name: 'Studio',
    description: 'Dusty rose with cleaner editorial contrast.',
    background: '#FAF1F2',
    orbPrimary: '#EBCFD5',
    orbSecondary: '#F4E1E5',
    orbTertiary: '#E7CDD4',
    hero: '#9C5967',
    heroShadow: '#63333D',
    heroChip: 'rgba(255,255,255,0.15)',
    heroChipText: '#FFF6F8',
    heroStatusGood: '#F7E2E7',
    heroStatusAlert: '#FFF0E8',
    heroStatusGoodText: '#834654',
    heroStatusAlertText: '#AF4A39',
    heroText: '#FFF8FA',
    heroMuted: '#F2DCE2',
    heroPanel: '#FFF9FA',
    heroPanelSoft: '#F8E8EC',
    surface: 'rgba(255,255,255,0.94)',
    surfaceSoft: '#F8F0F2',
    surfaceTint: '#F4E4E8',
    surfaceMuted: '#FBF4F6',
    surfaceStrong: '#F6E9ED',
    text: '#6F4150',
    textMuted: '#8F6873',
    textSoft: '#9A7A82',
    placeholder: '#9A7A82',
    accent: '#C97388',
    accentSoft: '#E3A7B7',
    accentText: '#8B5160',
    accentBorder: '#C97388',
    progressTrack: '#EBCFD6',
    progressGood: '#C97388',
    progressWarning: '#D8A15C',
    progressAlert: '#D26464',
    successSurface: '#F7E2E7',
    successText: '#8B5160',
    warningSurface: '#FBEFD9',
    warningText: '#A06A2A',
    alertSurface: '#FBE4E4',
    alertText: '#B14B4B',
    divider: '#E9D8DD',
    shadow: '#B49AA2',
    switchOff: '#E5D4D9',
    switchOn: '#DDAEBB',
    switchThumbOn: '#C97388',
    switchThumbOff: '#FFFFFF',
  },
};

export const appThemeOrder: AppThemeId[] = ['sunrise', 'lagoon', 'meadow', 'blush'];

export const categoryThemes: Record<
  ThemeId,
  {
    surface: string;
    bubble: string;
    bubbleText: string;
    track: string;
    fill: string;
    border: string;
    chip: string;
    chipText: string;
  }
> = {
  citrus: {
    surface: '#FFF7F0',
    bubble: '#FFD9BE',
    bubbleText: '#8D4617',
    track: '#F8DDC5',
    fill: '#F08630',
    border: '#F2DAC6',
    chip: '#FFF0E2',
    chipText: '#8D4617',
  },
  apricot: {
    surface: '#FFF6EE',
    bubble: '#FFD8C3',
    bubbleText: '#9A5630',
    track: '#F6DDCC',
    fill: '#E99A62',
    border: '#F0DACA',
    chip: '#FFECE0',
    chipText: '#9A5630',
  },
  clay: {
    surface: '#FFF3EF',
    bubble: '#F7CFC4',
    bubbleText: '#8C4332',
    track: '#EFD5CD',
    fill: '#D97A61',
    border: '#EDD5CC',
    chip: '#FBE5DE',
    chipText: '#8C4332',
  },
  sun: {
    surface: '#FFF9F0',
    bubble: '#FFE4B9',
    bubbleText: '#99600E',
    track: '#F5E3C5',
    fill: '#E7AA3C',
    border: '#EEDFC5',
    chip: '#FFF1D9',
    chipText: '#99600E',
  },
  ember: {
    surface: '#FFF4EC',
    bubble: '#FFD2B1',
    bubbleText: '#9C4E1F',
    track: '#F4D7BE',
    fill: '#E06C2F',
    border: '#EFD4BE',
    chip: '#FFE7D4',
    chipText: '#9C4E1F',
  },
};

export const themeCycle: ThemeId[] = ['citrus', 'apricot', 'clay', 'sun', 'ember'];

export const quickPresets: QuickPreset[] = [
  { name: 'Rent', planned: 850, bucket: 'needs', themeId: 'clay', recurring: true },
  { name: 'Groceries', planned: 500, bucket: 'needs', themeId: 'citrus', recurring: true },
  { name: 'Bills', planned: 180, bucket: 'needs', themeId: 'apricot', recurring: true },
  { name: 'Coffee', planned: 90, bucket: 'wants', themeId: 'sun', recurring: false },
  { name: 'Streaming', planned: 60, bucket: 'wants', themeId: 'ember', recurring: true },
  { name: 'Transport', planned: 140, bucket: 'needs', themeId: 'apricot', recurring: true },
];

type LegacyBudget = {
  id: string;
  name: string;
  planned: number;
  spent: number;
  themeId?: string;
};

type LegacyDashboardState = {
  monthlyLimit?: string;
  budgets?: LegacyBudget[];
  updatedAt?: number;
};

type VersionTwoBudgetAppState = {
  version: 2;
  activeMonthId?: unknown;
  months?: unknown;
  goals?: unknown;
  preferences?: unknown;
  updatedAt?: unknown;
};

type VersionThreeBudgetAppState = {
  version: 3;
  activeMonthId?: unknown;
  months?: unknown;
  goals?: unknown;
  preferences?: unknown;
  updatedAt?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

export const normalizeCurrencyCode = (
  value: unknown,
  fallback: CurrencyCode = defaultCurrencyCode,
): CurrencyCode =>
  typeof value === 'string' &&
  currencyOptions.some((option) => option.code === value.trim().toUpperCase())
    ? value.trim().toUpperCase()
    : fallback;

export const normalizeLanguageCode = (
  value: unknown,
  fallback: LanguageCode = defaultLanguageCode,
): LanguageCode =>
  typeof value === 'string' && languageOptions.some((option) => option.code === value.trim().toLowerCase())
    ? value.trim().toLowerCase()
    : fallback;

const normalizeRecentCodes = (value: unknown, normalizeCode: (input: unknown) => string) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueCodes = new Set<string>();

  value.forEach((item) => {
    const normalized = normalizeCode(item);
    if (normalized) {
      uniqueCodes.add(normalized);
    }
  });

  return [...uniqueCodes].slice(0, 6);
};

export const getLocaleTag = (languageCode: LanguageCode = defaultLanguageCode) =>
  languageLocaleMap[languageCode] ?? languageCode;

export const currency = (
  value: number,
  currencyCode: CurrencyCode = defaultCurrencyCode,
  locale = getLocaleTag(),
) => {
  const fractionDigits = Math.abs(value - Math.round(value)) >= 0.01 ? 2 : 0;

  return new Intl.NumberFormat(locale || currencyLocaleMap[currencyCode] || 'en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getMonthId = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

export const parseMonthId = (monthId: string) => {
  const [yearText, monthText] = monthId.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return new Date();
  }

  return new Date(year, monthIndex, 1);
};

export const compareMonthIds = (left: string, right: string) =>
  parseMonthId(left).getTime() - parseMonthId(right).getTime();

export const getMonthLabel = (monthId: string, locale = getLocaleTag()) =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
  }).format(parseMonthId(monthId));

export const addMonths = (monthId: string, amount: number) => {
  const next = parseMonthId(monthId);
  next.setMonth(next.getMonth() + amount);
  return getMonthId(next);
};

export const getDaysInMonth = (monthId: string) => {
  const date = parseMonthId(monthId);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getDayOfMonth = (date: Date) => date.getDate();

export const getMonthName = (monthId: string, locale = getLocaleTag()) =>
  new Intl.DateTimeFormat(locale, {
    month: 'long',
  }).format(parseMonthId(monthId));

export const getMonogram = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const getCategoryGlyph = (name: string) => {
  const normalized = name.trim().toLowerCase();

  if (/(grocery|food|market|farm|produce)/.test(normalized)) {
    return 'cart';
  }

  if (/(transport|fuel|train|bus|car|travel)/.test(normalized)) {
    return 'car';
  }

  if (/(rent|mortgage|home|house|utilities)/.test(normalized)) {
    return 'home';
  }

  if (/(coffee|dining|restaurant|snack|bar)/.test(normalized)) {
    return 'cup';
  }

  if (/(subscription|stream|phone|tech|internet)/.test(normalized)) {
    return 'wifi';
  }

  if (/(health|pharmacy|doctor|wellness|gym)/.test(normalized)) {
    return 'plus';
  }

  if (/(shopping|clothes|style|gift)/.test(normalized)) {
    return 'bag';
  }

  return 'dot';
};

export const getBudgetTone = (ratio: number): BudgetTone => {
  if (ratio >= 1) {
    return 'alert';
  }

  if (ratio >= 0.8) {
    return 'warning';
  }

  return 'good';
};

export const inferThemeId = (name: string, index: number): ThemeId => {
  const normalized = name.trim().toLowerCase();

  if (/(rent|mortgage|home)/.test(normalized)) {
    return 'clay';
  }

  if (/(grocery|food|health|wellness|pharmacy)/.test(normalized)) {
    return 'citrus';
  }

  if (/(coffee|dining|restaurant|snack|fun)/.test(normalized)) {
    return 'sun';
  }

  if (/(transport|fuel|travel|car)/.test(normalized)) {
    return 'apricot';
  }

  if (/(subscription|stream|phone|tech|shopping)/.test(normalized)) {
    return 'ember';
  }

  return themeCycle[index % themeCycle.length];
};

export const inferRecurring = (name: string) =>
  /(rent|mortgage|subscription|stream|phone|insurance|gym|transport|grocer)/i.test(name);

export const inferCategoryBucket = (name: string): CategoryBucket => {
  const normalized = name.trim().toLowerCase();

  if (/(save|saving|emergency|invest|retire|deposit|debt|loan|holiday fund|vacation fund)/.test(normalized)) {
    return 'savings';
  }

  if (/(rent|mortgage|home|household|living|utilities|grocer|food|market|transport|fuel|car|doctor|health|supplement|vitamin|medicine|pharmacy|insurance|bill|phone|internet|childcare|school|cleaning|pet care)/.test(normalized)) {
    return 'needs';
  }

  return 'wants';
};

export const parseSubcategoryInput = (value: unknown) => {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n;|/]+/)
      : [];
  const uniqueValues = new Set<string>();

  rawValues.forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }

    const normalized = item.replace(/\s+/g, ' ').trim();
    if (normalized) {
      uniqueValues.add(normalized);
    }
  });

  return [...uniqueValues].slice(0, 10);
};

const normalizeThemeId = (value: unknown, fallback: ThemeId): ThemeId =>
  typeof value === 'string' && themeCycle.includes(value as ThemeId) ? (value as ThemeId) : fallback;

const normalizeAppThemeId = (value: unknown, fallback: AppThemeId = 'sunrise'): AppThemeId =>
  typeof value === 'string' && value in appThemes ? (value as AppThemeId) : fallback;

export const normalizeBankAccountKind = (
  value: unknown,
  fallback: BankAccountKind = 'spending',
): BankAccountKind =>
  typeof value === 'string' && bankAccountKindOrder.includes(value as BankAccountKind)
    ? (value as BankAccountKind)
    : fallback;

export const normalizeBankAccountKinds = (
  value: unknown,
  fallback: BankAccountKind[] = ['spending'],
) => {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n;|/]+/)
      : [];
  const uniqueValues = new Set<BankAccountKind>();

  rawValues.forEach((item) => {
    const normalized = normalizeBankAccountKind(item, '' as BankAccountKind);
    if (normalized && bankAccountKindOrder.includes(normalized)) {
      uniqueValues.add(normalized);
    }
  });

  if (uniqueValues.size > 0) {
    return bankAccountKindOrder.filter((kind) => uniqueValues.has(kind));
  }

  return fallback;
};

export const parseBankAccountCustomKinds = (value: unknown) => {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n;|/]+/)
      : [];
  const uniqueValues = new Set<string>();

  rawValues.forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }

    const normalized = item.replace(/\s+/g, ' ').trim();
    if (normalized) {
      uniqueValues.add(normalized);
    }
  });

  return [...uniqueValues].slice(0, 8);
};

const normalizePreferences = (value: unknown): AppPreferences => {
  if (!isRecord(value)) {
    return {
      appThemeId: 'sunrise',
      currencyCode: defaultCurrencyCode,
      languageCode: defaultLanguageCode,
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    };
  }

  return {
    appThemeId: normalizeAppThemeId(value.appThemeId),
    currencyCode: normalizeCurrencyCode(value.currencyCode),
    languageCode: normalizeLanguageCode(value.languageCode),
    recentCurrencyCodes: normalizeRecentCodes(value.recentCurrencyCodes, normalizeCurrencyCode),
    recentLanguageCodes: normalizeRecentCodes(value.recentLanguageCodes, normalizeLanguageCode),
  };
};

const normalizeBankAccount = (value: unknown, index: number): BankAccount | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const customKinds = parseBankAccountCustomKinds(value.customKinds ?? value.customTags ?? value.tags);

  if (!name) {
    return null;
  }

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId(`acct-${index}`),
    name,
    kinds: normalizeBankAccountKinds(
      value.kinds ?? value.kind,
      customKinds.length > 0 ? [] : [normalizeBankAccountKind(value.kind)],
    ),
    customKinds,
  };
};

const normalizeCategory = (value: unknown, index: number): Category | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const planned = toFiniteNumber(value.planned);

  if (!name || planned <= 0) {
    return null;
  }

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId('cat'),
    name,
    planned,
    subcategories: parseSubcategoryInput(value.subcategories),
    bucket:
      typeof value.bucket === 'string' &&
      categoryBucketOrder.includes(value.bucket as CategoryBucket)
        ? (value.bucket as CategoryBucket)
        : inferCategoryBucket(name),
    themeId: normalizeThemeId(value.themeId, inferThemeId(name, index)),
    recurring:
      typeof value.recurring === 'boolean' ? value.recurring : inferRecurring(name),
  };
};

const normalizeTransaction = (value: unknown): Transaction | null => {
  if (!isRecord(value)) {
    return null;
  }

  const categoryId = typeof value.categoryId === 'string' ? value.categoryId : '';
  const amount = toFiniteNumber(value.amount);
  const happenedAt = typeof value.happenedAt === 'string' ? value.happenedAt : '';

  if (!categoryId || amount <= 0 || !happenedAt) {
    return null;
  }

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId('txn'),
    categoryId,
    accountId: typeof value.accountId === 'string' && value.accountId ? value.accountId : undefined,
    amount,
    note: typeof value.note === 'string' ? value.note : '',
    happenedAt,
    recurring: typeof value.recurring === 'boolean' ? value.recurring : false,
  };
};

const normalizeGoal = (value: unknown, index: number): Goal | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const target = toFiniteNumber(value.target);
  const saved = toFiniteNumber(value.saved);

  if (!name || target <= 0 || saved < 0) {
    return null;
  }

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId('goal'),
    name,
    target,
    saved,
    themeId: normalizeThemeId(value.themeId, themeCycle[index % themeCycle.length]),
  };
};

const normalizeMonthRecord = (
  value: unknown,
  fallbackCurrencyCode: CurrencyCode = defaultCurrencyCode,
): MonthRecord | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.monthlyLimit !== 'string') {
    return null;
  }

  const categories = Array.isArray(value.categories)
    ? value.categories
        .map((item, index) => normalizeCategory(item, index))
        .filter((item): item is Category => item !== null)
    : [];

  const transactions = Array.isArray(value.transactions)
    ? value.transactions
        .map((item) => normalizeTransaction(item))
        .filter((item): item is Transaction => item !== null)
    : [];

  return {
    id: value.id,
    currencyCode: normalizeCurrencyCode(value.currencyCode, fallbackCurrencyCode),
    monthlyLimit: value.monthlyLimit,
    categories,
    transactions,
    updatedAt: toFiniteNumber(value.updatedAt, Date.now()),
  };
};

export const buildIsoDateForMonth = (monthId: string, day: number) => {
  const monthDate = parseMonthId(monthId);
  const clampedDay = Math.min(Math.max(day, 1), getDaysInMonth(monthId));
  return new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    clampedDay,
    12,
    0,
    0,
  ).toISOString();
};

export const createEmptyMonth = (
  monthId: string,
  monthlyLimit: MonthlyLimit = '0',
  currencyCode: CurrencyCode = defaultCurrencyCode,
): MonthRecord => ({
  id: monthId,
  currencyCode,
  monthlyLimit,
  categories: [],
  transactions: [],
  updatedAt: Date.now(),
});

export const copyMonthBudget = (sourceMonth: MonthRecord, targetMonthId: string): MonthRecord => ({
  id: targetMonthId,
  currencyCode: sourceMonth.currencyCode,
  monthlyLimit: sourceMonth.monthlyLimit,
  categories: sourceMonth.categories.map((category) => ({
    ...category,
    id: createId('cat'),
  })),
  transactions: [],
  updatedAt: Date.now(),
});

export const createInitialBudgetState = (referenceDate = new Date()): BudgetAppState => {
  const monthId = getMonthId(referenceDate);

  return {
    version: 4,
    activeMonthId: monthId,
    months: [createEmptyMonth(monthId)],
    accounts: [],
    goals: [],
    preferences: {
      appThemeId: 'sunrise',
      currencyCode: defaultCurrencyCode,
      languageCode: defaultLanguageCode,
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    },
    updatedAt: Date.now(),
  };
};

const copyRecurringTransaction = (
  transaction: Transaction,
  sourceMonthId: string,
  targetMonthId: string,
  categoryIdMap: Map<string, string>,
): Transaction | null => {
  const nextCategoryId = categoryIdMap.get(transaction.categoryId);

  if (!nextCategoryId) {
    return null;
  }

  const originalDate = new Date(transaction.happenedAt);

  return {
    ...transaction,
    id: createId('txn'),
    categoryId: nextCategoryId,
    happenedAt: buildIsoDateForMonth(targetMonthId, originalDate.getDate()),
  };
};

export const rollMonthForward = (sourceMonth: MonthRecord, targetMonthId: string): MonthRecord => {
  const recurringCategories = sourceMonth.categories.filter((category) => category.recurring);
  const categoryIdMap = new Map<string, string>();

  const categories = recurringCategories.map((category) => {
    const nextCategory = {
      ...category,
      id: createId('cat'),
    };

    categoryIdMap.set(category.id, nextCategory.id);
    return nextCategory;
  });

  const transactions = sourceMonth.transactions
    .filter((transaction) => transaction.recurring)
    .map((transaction) =>
      copyRecurringTransaction(transaction, sourceMonth.id, targetMonthId, categoryIdMap),
    )
    .filter((transaction): transaction is Transaction => transaction !== null);

  return {
    id: targetMonthId,
    currencyCode: sourceMonth.currencyCode,
    monthlyLimit: sourceMonth.monthlyLimit,
    categories,
    transactions,
    updatedAt: Date.now(),
  };
};

export const ensureCurrentMonth = (
  inputState: BudgetAppState,
  referenceDate = new Date(),
): BudgetAppState => {
  const currentMonthId = getMonthId(referenceDate);
  const months = [...inputState.months].sort((left, right) => compareMonthIds(left.id, right.id));

  if (months.length === 0) {
    const starter = createEmptyMonth(currentMonthId, '0', inputState.preferences.currencyCode);

    return {
      ...inputState,
      activeMonthId: currentMonthId,
      months: [starter],
      updatedAt: Date.now(),
    };
  }

  let latestMonth = months[months.length - 1];

  while (compareMonthIds(latestMonth.id, currentMonthId) < 0) {
    const nextMonth = rollMonthForward(latestMonth, addMonths(latestMonth.id, 1));
    months.push(nextMonth);
    latestMonth = nextMonth;
  }

  return {
    ...inputState,
    activeMonthId: months.some((month) => month.id === inputState.activeMonthId)
      ? inputState.activeMonthId
      : currentMonthId,
    months: months.sort((left, right) => compareMonthIds(right.id, left.id)),
    updatedAt: inputState.updatedAt || Date.now(),
  };
};

export const migrateLegacyDashboardState = (
  value: unknown,
  referenceDate = new Date(),
): BudgetAppState | null => {
  if (!isRecord(value)) {
    return null;
  }

  const legacy = value as LegacyDashboardState;

  if (!Array.isArray(legacy.budgets)) {
    return null;
  }

  const monthId = getMonthId(referenceDate);
  const categories = legacy.budgets
    .map((budget, index) =>
      normalizeCategory(
        {
          id: budget.id || createId('cat'),
          name: budget.name,
          planned: budget.planned,
          themeId: budget.themeId,
          recurring: inferRecurring(budget.name),
        },
        index,
      ),
    )
    .filter((category): category is Category => category !== null);

  const transactions = legacy.budgets
    .filter((budget) => toFiniteNumber(budget.spent) > 0)
    .map((budget) => {
      const matchingCategory = categories.find((category) => category.name === budget.name);

      if (!matchingCategory) {
        return null;
      }

      return {
        id: createId('txn'),
        categoryId: matchingCategory.id,
        amount: toFiniteNumber(budget.spent),
        note: 'Imported balance',
        happenedAt: buildIsoDateForMonth(monthId, 14),
        recurring: false,
      };
    })
    .filter((transaction): transaction is Transaction => transaction !== null);

  return {
    version: 4,
    activeMonthId: monthId,
    months: [
      {
        id: monthId,
        currencyCode: defaultCurrencyCode,
        monthlyLimit: typeof legacy.monthlyLimit === 'string' ? legacy.monthlyLimit : '1500',
        categories,
        transactions,
        updatedAt: toFiniteNumber(legacy.updatedAt, Date.now()),
      },
    ],
    accounts: [],
    goals: [],
    preferences: {
      appThemeId: 'sunrise',
      currencyCode: defaultCurrencyCode,
      languageCode: defaultLanguageCode,
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    },
    updatedAt: toFiniteNumber(legacy.updatedAt, Date.now()),
  };
};

export const normalizeBudgetAppState = (
  value: unknown,
  referenceDate = new Date(),
): BudgetAppState | null => {
  if (!isRecord(value)) {
    return migrateLegacyDashboardState(value, referenceDate);
  }

  if (value.version !== 2 && value.version !== 3 && value.version !== 4) {
    return migrateLegacyDashboardState(value, referenceDate);
  }

  const preferences =
    value.version === 3 || value.version === 4
      ? normalizePreferences(value.preferences)
      : normalizePreferences((value as VersionTwoBudgetAppState | VersionThreeBudgetAppState).preferences);

  const months = Array.isArray(value.months)
    ? value.months
        .map((month) => normalizeMonthRecord(month, preferences.currencyCode))
        .filter((month): month is MonthRecord => month !== null)
    : [];

  const goals = Array.isArray(value.goals)
    ? value.goals
        .map((goal, index) => normalizeGoal(goal, index))
        .filter((goal): goal is Goal => goal !== null)
    : [];

  const accounts = Array.isArray(value.accounts)
    ? value.accounts
        .map((account, index) => normalizeBankAccount(account, index))
        .filter((account): account is BankAccount => account !== null)
    : [];

  const state: BudgetAppState = {
    version: 4,
    activeMonthId: typeof value.activeMonthId === 'string' ? value.activeMonthId : getMonthId(referenceDate),
    months,
    accounts,
    goals,
    preferences,
    updatedAt: toFiniteNumber(value.updatedAt, Date.now()),
  };

  return ensureCurrentMonth(state, referenceDate);
};

export const sortTransactions = (transactions: Transaction[], sortBy: 'recent' | 'highest') => {
  const nextTransactions = [...transactions];

  if (sortBy === 'highest') {
    return nextTransactions.sort((left, right) => right.amount - left.amount);
  }

  return nextTransactions.sort(
    (left, right) => new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime(),
  );
};

const getWeekBucket = (date: Date) => {
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

export const getWeeklyTotals = (transactions: Transaction[]) =>
  transactions.reduce<[number, number, number, number]>(
    (totals, transaction) => {
      const bucket = getWeekBucket(new Date(transaction.happenedAt));
      const nextTotals = [...totals] as [number, number, number, number];
      nextTotals[bucket] += transaction.amount;
      return nextTotals;
    },
    [0, 0, 0, 0],
  );

export const getCategorySummaries = (month: MonthRecord): CategorySummary[] =>
  month.categories.map((category) => {
    const transactions = month.transactions.filter(
      (transaction) => transaction.categoryId === category.id,
    );
    const spent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const left = category.planned - spent;
    const ratio = category.planned > 0 ? spent / category.planned : 0;
    const thisWeek = transactions
      .filter((transaction) => getWeekBucket(new Date(transaction.happenedAt)) === 3)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      category,
      spent,
      left,
      ratio,
      tone: getBudgetTone(ratio),
      thisWeek,
      transactions,
    };
  });

export const getTotalPlanned = (month: MonthRecord) =>
  month.categories.reduce((sum, category) => sum + category.planned, 0);

export const getTotalSpent = (month: MonthRecord) =>
  month.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

export const getTopCategory = (summaries: CategorySummary[]) =>
  summaries.reduce<CategorySummary | null>(
    (currentTop, summary) => (!currentTop || summary.spent > currentTop.spent ? summary : currentTop),
    null,
  );

export const getPaceDrivenSpend = (month: MonthRecord) =>
  month.transactions
    .filter((transaction) => !transaction.recurring)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

export const getProjectedCategorySpend = (
  month: MonthRecord,
  category: Category,
  referenceDate = new Date(),
) => {
  const transactions = month.transactions.filter((transaction) => transaction.categoryId === category.id);
  const spent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const currentMonthId = getMonthId(referenceDate);

  if (month.id !== currentMonthId) {
    return spent;
  }

  const elapsedDays = Math.max(getDayOfMonth(referenceDate), 1);
  const recurringSpent = transactions
    .filter((transaction) => transaction.recurring)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const variableSpent = transactions
    .filter((transaction) => !transaction.recurring)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const variableProjectedSpend =
    elapsedDays > 0 ? (variableSpent / elapsedDays) * getDaysInMonth(month.id) : 0;
  const recurringBaseline = category.recurring ? category.planned : 0;

  return Math.max(spent, recurringBaseline, recurringSpent + variableProjectedSpend);
};

export const getProjectedSpend = (month: MonthRecord, referenceDate = new Date()) => {
  const currentMonthId = getMonthId(referenceDate);
  const totalSpent = getTotalSpent(month);

  if (month.id !== currentMonthId) {
    return totalSpent;
  }

  return month.categories.reduce(
    (sum, category) => sum + getProjectedCategorySpend(month, category, referenceDate),
    0,
  );
};

export const formatTransactionDate = (happenedAt: string, locale = getLocaleTag()) =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(happenedAt));
