export type ThemeId = 'citrus' | 'apricot' | 'clay' | 'sun' | 'ember';
export type AppThemeId = 'indigo' | 'emerald' | 'slate' | 'cobalt' | 'breeze' | 'garden' | 'coral' | 'lavender' | 'serenity' | 'sage' | 'warmclay' | 'twilight';
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
  subcategory?: string;
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
  cloudBackupEnabled: boolean;
  currencyCode: CurrencyCode;
  languageCode: LanguageCode;
  recentCurrencyCodes: CurrencyCode[];
  recentLanguageCodes: LanguageCode[];
};

export type BudgetAppState = {
  version: 5;
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
  indigo: {
    id: 'indigo',
    name: 'Indigo Night',
    description: 'Deep navy with vivid cyan accents. Modern and bold.',
    background: '#080E1A',
    orbPrimary: '#1F2D4D',
    orbSecondary: '#152E4F',
    orbTertiary: '#1A3555',
    hero: '#101828',
    heroShadow: '#050812',
    heroChip: 'rgba(34, 211, 238, 0.15)',
    heroChipText: '#22D3EE',
    heroStatusGood: '#065F46',
    heroStatusAlert: '#7C2D12',
    heroStatusGoodText: '#10B981',
    heroStatusAlertText: '#FB923C',
    heroText: '#F8FAFC',
    heroMuted: '#475569',
    heroPanel: '#192E4A',
    heroPanelSoft: '#253555',
    surface: 'rgba(25, 46, 74, 0.97)',
    surfaceSoft: '#192E4A',
    surfaceTint: '#2D4263',
    surfaceMuted: '#0D1520',
    surfaceStrong: '#2D4263',
    text: '#F1F5F9',
    textMuted: '#CBD5E1',
    textSoft: '#94A3B8',
    placeholder: '#64748B',
    accent: '#22D3EE',
    accentSoft: '#164E63',
    accentText: '#22D3EE',
    accentBorder: '#0891B2',
    progressTrack: '#2D4263',
    progressGood: '#10B981',
    progressWarning: '#F59E0B',
    progressAlert: '#EF4444',
    successSurface: '#064E3B',
    successText: '#10B981',
    warningSurface: '#78350F',
    warningText: '#FCD34D',
    alertSurface: '#7C2D12',
    alertText: '#FCA5A5',
    divider: '#2D4263',
    shadow: '#000000',
    switchOff: '#475569',
    switchOn: '#0891B2',
    switchThumbOn: '#22D3EE',
    switchThumbOff: '#CBD5E1',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Depths',
    description: 'Rich deep teal with golden accents. Sophisticated and luxe.',
    background: '#071A14',
    orbPrimary: '#0D5B47',
    orbSecondary: '#0D6B54',
    orbTertiary: '#106B54',
    hero: '#0F7A5F',
    heroShadow: '#051B12',
    heroChip: 'rgba(34, 197, 94, 0.15)',
    heroChipText: '#10B981',
    heroStatusGood: '#065F46',
    heroStatusAlert: '#7C2D12',
    heroStatusGoodText: '#10B981',
    heroStatusAlertText: '#FB923C',
    heroText: '#F0FDF4',
    heroMuted: '#86EFAC',
    heroPanel: '#0D6B54',
    heroPanelSoft: '#13825F',
    surface: 'rgba(13, 107, 84, 0.97)',
    surfaceSoft: '#0F8B6E',
    surfaceTint: '#10A866',
    surfaceMuted: '#051F1A',
    surfaceStrong: '#139375',
    text: '#ECFDF5',
    textMuted: '#A7F3D0',
    textSoft: '#6EE7B7',
    placeholder: '#34D399',
    accent: '#F59E0B',
    accentSoft: '#A16207',
    accentText: '#FCD34D',
    accentBorder: '#F59E0B',
    progressTrack: '#10A866',
    progressGood: '#10B981',
    progressWarning: '#F59E0B',
    progressAlert: '#EF4444',
    successSurface: '#064E3B',
    successText: '#10B981',
    warningSurface: '#78350F',
    warningText: '#FCD34D',
    alertSurface: '#7C2D12',
    alertText: '#FCA5A5',
    divider: '#10A866',
    shadow: '#000000',
    switchOff: '#10A866',
    switchOn: '#059669',
    switchThumbOn: '#34D399',
    switchThumbOff: '#A7F3D0',
  },
  slate: {
    id: 'slate',
    name: 'Slate Storm',
    description: 'Charcoal with hot pink and electric cyan. Bold and energetic.',
    background: '#111827',
    orbPrimary: '#1F2937',
    orbSecondary: '#374151',
    orbTertiary: '#253545',
    hero: '#1F2937',
    heroShadow: '#030712',
    heroChip: 'rgba(236, 72, 153, 0.16)',
    heroChipText: '#F472B6',
    heroStatusGood: '#065F46',
    heroStatusAlert: '#7C2D12',
    heroStatusGoodText: '#10B981',
    heroStatusAlertText: '#FB923C',
    heroText: '#F3F4F6',
    heroMuted: '#9CA3AF',
    heroPanel: '#1F2937',
    heroPanelSoft: '#2D3748',
    surface: 'rgba(31, 41, 55, 0.97)',
    surfaceSoft: '#1F2937',
    surfaceTint: '#374151',
    surfaceMuted: '#0F1117',
    surfaceStrong: '#2D3748',
    text: '#F3F4F6',
    textMuted: '#D1D5DB',
    textSoft: '#9CA3AF',
    placeholder: '#6B7280',
    accent: '#F472B6',
    accentSoft: '#BE185D',
    accentText: '#F472B6',
    accentBorder: '#EC4899',
    progressTrack: '#374151',
    progressGood: '#10B981',
    progressWarning: '#F59E0B',
    progressAlert: '#FB7185',
    successSurface: '#064E3B',
    successText: '#10B981',
    warningSurface: '#78350F',
    warningText: '#FCD34D',
    alertSurface: '#7C2D12',
    alertText: '#FCA5A5',
    divider: '#374151',
    shadow: '#000000',
    switchOff: '#4B3559',
    switchOn: '#EC4899',
    switchThumbOn: '#F472B6',
    switchThumbOff: '#D1D5DB',
  },
  cobalt: {
    id: 'cobalt',
    name: 'Cobalt Electric',
    description: 'Deep black-blue with electric accents. Futuristic and bold.',
    background: '#090D1A',
    orbPrimary: '#151D2E',
    orbSecondary: '#1F2D45',
    orbTertiary: '#1C2538',
    hero: '#0A0F1D',
    heroShadow: '#000205',
    heroChip: 'rgba(96, 165, 250, 0.16)',
    heroChipText: '#60A5FA',
    heroStatusGood: '#065F46',
    heroStatusAlert: '#7C2D12',
    heroStatusGoodText: '#10B981',
    heroStatusAlertText: '#FB923C',
    heroText: '#E0E7FF',
    heroMuted: '#94A3B8',
    heroPanel: '#0F1729',
    heroPanelSoft: '#1A2540',
    surface: 'rgba(15, 23, 41, 0.97)',
    surfaceSoft: '#1A2540',
    surfaceTint: '#252F4D',
    surfaceMuted: '#050A15',
    surfaceStrong: '#2D3B5F',
    text: '#E0E7FF',
    textMuted: '#9CA3AF',
    textSoft: '#6B7280',
    placeholder: '#4B5563',
    accent: '#60A5FA',
    accentSoft: '#1E3A8A',
    accentText: '#93C5FD',
    accentBorder: '#1D4ED8',
    progressTrack: '#252F4D',
    progressGood: '#10B981',
    progressWarning: '#FBBF24',
    progressAlert: '#F87171',
    successSurface: '#033A16',
    successText: '#3FB950',
    warningSurface: '#5A4A00',
    warningText: '#D0883C',
    alertSurface: '#67060C',
    alertText: '#F6919B',
    divider: '#252F4D',
    shadow: '#000000',
    switchOff: '#252F4D',
    switchOn: '#3B82F6',
    switchThumbOn: '#93C5FD',
    switchThumbOff: '#9CA3AF',
  },
  breeze: {
    id: 'breeze',
    name: 'Breeze',
    description: 'Pure white with strong cool blue accents. Fresh and minimal.',
    background: '#FFFFFF',
    orbPrimary: '#EFF6FF',
    orbSecondary: '#F0F9FF',
    orbTertiary: '#E0F2FE',
    hero: '#F0F9FF',
    heroShadow: '#BFDBFE',
    heroChip: 'rgba(59, 130, 246, 0.12)',
    heroChipText: '#0284C7',
    heroStatusGood: '#ECFDF5',
    heroStatusAlert: '#FEF2F2',
    heroStatusGoodText: '#065F46',
    heroStatusAlertText: '#7C2D12',
    heroText: '#FFFFFF',
    heroMuted: '#DBEAFE',
    heroPanel: '#F8FAFC',
    heroPanelSoft: '#E0F2FE',
    surface: '#FFFFFF',
    surfaceSoft: '#F8FAFC',
    surfaceTint: '#EFF6FF',
    surfaceMuted: '#F1F5F9',
    surfaceStrong: '#DBEAFE',
    text: '#1E293B',
    textMuted: '#64748B',
    textSoft: '#94A3B8',
    placeholder: '#CBD5E1',
    accent: '#0284C7',
    accentSoft: '#DBEAFE',
    accentText: '#0284C7',
    accentBorder: '#0284C7',
    progressTrack: '#DBEAFE',
    progressGood: '#16A34A',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FFFBEB',
    warningText: '#B45309',
    alertSurface: '#FEF2F2',
    alertText: '#DC2626',
    divider: '#E2E8F0',
    shadow: '#E2E8F0',
    switchOff: '#CBD5E1',
    switchOn: '#0284C7',
    switchThumbOn: '#60A5FA',
    switchThumbOff: '#FFFFFF',
  },
  garden: {
    id: 'garden',
    name: 'Garden Fresh',
    description: 'Warm off-white with vibrant teal. Lush and natural.',
    background: '#F7FBF5',
    orbPrimary: '#F0FDF4',
    orbSecondary: '#ECFDFFEB',
    orbTertiary: '#DCFCE7',
    hero: '#F0FDF4',
    heroShadow: '#BBCF6F',
    heroChip: 'rgba(13, 148, 136, 0.12)',
    heroChipText: '#0D9488',
    heroStatusGood: '#ECFDF5',
    heroStatusAlert: '#FEF2F2',
    heroStatusGoodText: '#065F46',
    heroStatusAlertText: '#7C2D12',
    heroText: '#FFFFFF',
    heroMuted: '#DCFCE7',
    heroPanel: '#F2FAF8',
    heroPanelSoft: '#E0FFF7',
    surface: '#FFFFFF',
    surfaceSoft: '#F7FEF5',
    surfaceTint: '#E0FFF7',
    surfaceMuted: '#F1F5F3',
    surfaceStrong: '#C0F5EF',
    text: '#0D6B54',
    textMuted: '#5A7A7A',
    textSoft: '#7A9B9B',
    placeholder: '#A0BFBF',
    accent: '#0D9488',
    accentSoft: '#CCFBF1',
    accentText: '#0D9488',
    accentBorder: '#0D9488',
    progressTrack: '#CCFBF1',
    progressGood: '#10B981',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FFFBEB',
    warningText: '#B45309',
    alertSurface: '#FEF2F2',
    alertText: '#DC2626',
    divider: '#CCFBF1',
    shadow: '#E5E7EB',
    switchOff: '#CCFBF1',
    switchOn: '#0D9488',
    switchThumbOn: '#14B8A6',
    switchThumbOff: '#FFFFFF',
  },
  coral: {
    id: 'coral',
    name: 'Coral Glow',
    description: 'Warm cream with vibrant coral. Sun-drenched and playful.',
    background: '#FFFBF5',
    orbPrimary: '#FEF1E6',
    orbSecondary: '#FDEAE0',
    orbTertiary: '#FCE4DD',
    hero: '#FEF1E6',
    heroShadow: '#FBAA7D',
    heroChip: 'rgba(249, 115, 22, 0.12)',
    heroChipText: '#EA580C',
    heroStatusGood: '#ECFDF5',
    heroStatusAlert: '#FEF2F2',
    heroStatusGoodText: '#065F46',
    heroStatusAlertText: '#7C2D12',
    heroText: '#FFFFFF',
    heroMuted: '#FDBF8B',
    heroPanel: '#FFFBF5',
    heroPanelSoft: '#FEF1E6',
    surface: '#FFFFFF',
    surfaceSoft: '#FFFBF5',
    surfaceTint: '#FEF1E6',
    surfaceMuted: '#F5F1F0',
    surfaceStrong: '#FDBF8B',
    text: '#9A3412',
    textMuted: '#84430F',
    textSoft: '#A85A2A',
    placeholder: '#C97C3A',
    accent: '#F97316',
    accentSoft: '#FDBF8B',
    accentText: '#F97316',
    accentBorder: '#F97316',
    progressTrack: '#FDBF8B',
    progressGood: '#16A34A',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FFFBEB',
    warningText: '#B45309',
    alertSurface: '#FEF2F2',
    alertText: '#DC2626',
    divider: '#FDBF8B',
    shadow: '#F3E8E8',
    switchOff: '#FDBF8B',
    switchOn: '#F97316',
    switchThumbOn: '#FB923C',
    switchThumbOff: '#FFFFFF',
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender Dream',
    description: 'Soft lavender with vivid purple. Elegant and modern.',
    background: '#FAF5FF',
    orbPrimary: '#F3E8FF',
    orbSecondary: '#F5E6FD',
    orbTertiary: '#EDE9FE',
    hero: '#F3E8FF',
    heroShadow: '#D8B4FE',
    heroChip: 'rgba(168, 85, 247, 0.12)',
    heroChipText: '#A855F7',
    heroStatusGood: '#ECFDF5',
    heroStatusAlert: '#FEF2F2',
    heroStatusGoodText: '#065F46',
    heroStatusAlertText: '#7C2D12',
    heroText: '#FFFFFF',
    heroMuted: '#E9D5FF',
    heroPanel: '#F8F3FC',
    heroPanelSoft: '#F3E8FF',
    surface: '#FFFFFF',
    surfaceSoft: '#FAF5FF',
    surfaceTint: '#F3E8FF',
    surfaceMuted: '#F5F1F9',
    surfaceStrong: '#E9D5FF',
    text: '#6B21A8',
    textMuted: '#7C3AED',
    textSoft: '#A78BFA',
    placeholder: '#C4B5FD',
    accent: '#A855F7',
    accentSoft: '#EDE9FE',
    accentText: '#A855F7',
    accentBorder: '#A855F7',
    progressTrack: '#E9D5FF',
    progressGood: '#16A34A',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FFFBEB',
    warningText: '#B45309',
    alertSurface: '#FEF2F2',
    alertText: '#DC2626',
    divider: '#E9D5FF',
    shadow: '#F3E8E8',
    switchOff: '#E9D5FF',
    switchOn: '#A855F7',
    switchThumbOn: '#C084FC',
    switchThumbOff: '#FFFFFF',
  },
  serenity: {
    id: 'serenity',
    name: 'Serenity',
    description: 'Light blue-gray with strong steel blue. Calm and collected.',
    background: '#F0F7FF',
    orbPrimary: '#E9F0F5',
    orbSecondary: '#EEF4F8',
    orbTertiary: '#E8EFF5',
    hero: '#EEF4F8',
    heroShadow: '#C5D9E8',
    heroChip: 'rgba(59, 130, 246, 0.12)',
    heroChipText: '#3B82F6',
    heroStatusGood: '#E8F5F0',
    heroStatusAlert: '#F5EEE8',
    heroStatusGoodText: '#1F5D56',
    heroStatusAlertText: '#6B4423',
    heroText: '#FFFFFF',
    heroMuted: '#E0E8F0',
    heroPanel: '#F5F8FA',
    heroPanelSoft: '#E9F0F5',
    surface: '#FFFFFF',
    surfaceSoft: '#F5F8FA',
    surfaceTint: '#E9F0F5',
    surfaceMuted: '#F1F4F7',
    surfaceStrong: '#DBEAFE',
    text: '#0C4A6E',
    textMuted: '#0369A1',
    textSoft: '#0284C7',
    placeholder: '#0EA5E9',
    accent: '#3B82F6',
    accentSoft: '#DBEAFE',
    accentText: '#3B82F6',
    accentBorder: '#3B82F6',
    progressTrack: '#DBEAFE',
    progressGood: '#16A34A',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FEFCE8',
    warningText: '#92400E',
    alertSurface: '#FEF2F2',
    alertText: '#991B1B',
    divider: '#DBEAFE',
    shadow: '#DBEAFE',
    switchOff: '#DBEAFE',
    switchOn: '#3B82F6',
    switchThumbOn: '#60A5FA',
    switchThumbOff: '#FFFFFF',
  },
  sage: {
    id: 'sage',
    name: 'Sage Rest',
    description: 'Natural white with rich sage green. Grounded and natural.',
    background: '#F5FAF5',
    orbPrimary: '#E8EFE8',
    orbSecondary: '#EEF4EE',
    orbTertiary: '#E8EDE8',
    hero: '#EEF4EE',
    heroShadow: '#BFD0C0',
    heroChip: 'rgba(76, 175, 114, 0.12)',
    heroChipText: '#4CAF72',
    heroStatusGood: '#E8F5F0',
    heroStatusAlert: '#F5EEE8',
    heroStatusGoodText: '#1F5D56',
    heroStatusAlertText: '#6B4423',
    heroText: '#FFFFFF',
    heroMuted: '#DFE8DF',
    heroPanel: '#F5F8F5',
    heroPanelSoft: '#E8F5E8',
    surface: '#FFFFFF',
    surfaceSoft: '#F5F8F5',
    surfaceTint: '#E8F5E8',
    surfaceMuted: '#F1F4F1',
    surfaceStrong: '#D1E8D1',
    text: '#1B5E2B',
    textMuted: '#4B8C5E',
    textSoft: '#6BA875',
    placeholder: '#8CC99F',
    accent: '#4CAF72',
    accentSoft: '#D8E6D8',
    accentText: '#4CAF72',
    accentBorder: '#4CAF72',
    progressTrack: '#D1E8D1',
    progressGood: '#16A34A',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FEFCE8',
    warningText: '#92400E',
    alertSurface: '#FEF2F2',
    alertText: '#991B1B',
    divider: '#D1E8D1',
    shadow: '#DFE8DF',
    switchOff: '#D1E8D1',
    switchOn: '#4CAF72',
    switchThumbOn: '#6BA875',
    switchThumbOff: '#FFFFFF',
  },
  warmclay: {
    id: 'warmclay',
    name: 'Warm Clay',
    description: 'Creamy with terracotta warmth. Cozy and earthy.',
    background: '#FAF5F0',
    orbPrimary: '#F0E8E3',
    orbSecondary: '#F5EFE9',
    orbTertiary: '#EEEBE5',
    hero: '#F0E8E3',
    heroShadow: '#D1C0B8',
    heroChip: 'rgba(194, 71, 15, 0.12)',
    heroChipText: '#C2410C',
    heroStatusGood: '#E8F5F0',
    heroStatusAlert: '#F5EEE8',
    heroStatusGoodText: '#1F5D56',
    heroStatusAlertText: '#6B4423',
    heroText: '#FFFFFF',
    heroMuted: '#E6DDD5',
    heroPanel: '#F8F4F1',
    heroPanelSoft: '#F0E8E3',
    surface: '#FFFFFF',
    surfaceSoft: '#F8F4F1',
    surfaceTint: '#F0E8E3',
    surfaceMuted: '#F3EDE8',
    surfaceStrong: '#E6D1C1',
    text: '#7C2D12',
    textMuted: '#92400E',
    textSoft: '#A85A2A',
    placeholder: '#C2714F',
    accent: '#C2714F',
    accentSoft: '#E6D1C1',
    accentText: '#C2714F',
    accentBorder: '#C2714F',
    progressTrack: '#E6D1C1',
    progressGood: '#16A34A',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FEFCE8',
    warningText: '#92400E',
    alertSurface: '#FEF2F2',
    alertText: '#991B1B',
    divider: '#E6D1C1',
    shadow: '#E6D1C1',
    switchOff: '#E6D1C1',
    switchOn: '#C2714F',
    switchThumbOn: '#D4875E',
    switchThumbOff: '#FFFFFF',
  },
  twilight: {
    id: 'twilight',
    name: 'Twilight Rose',
    description: 'Soft rose-purple with deeper purple accents. Serene and elegant.',
    background: '#FDF5FF',
    orbPrimary: '#EDE8F2',
    orbSecondary: '#F2EDF7',
    orbTertiary: '#E8E5EF',
    hero: '#EDE8F2',
    heroShadow: '#D1C5DC',
    heroChip: 'rgba(139, 92, 246, 0.12)',
    heroChipText: '#8B5CF6',
    heroStatusGood: '#E8F5F0',
    heroStatusAlert: '#F5EEE8',
    heroStatusGoodText: '#1F5D56',
    heroStatusAlertText: '#6B4423',
    heroText: '#FFFFFF',
    heroMuted: '#E0D9EA',
    heroPanel: '#F7F3FA',
    heroPanelSoft: '#EDE8F2',
    surface: '#FFFFFF',
    surfaceSoft: '#F7F3FA',
    surfaceTint: '#EDE8F2',
    surfaceMuted: '#F2EFFA',
    surfaceStrong: '#E0D9EA',
    text: '#3F354D',
    textMuted: '#6B21A8',
    textSoft: '#7C3AED',
    placeholder: '#A78BFA',
    accent: '#8B5CF6',
    accentSoft: '#EDE9FE',
    accentText: '#8B5CF6',
    accentBorder: '#8B5CF6',
    progressTrack: '#EDE9FE',
    progressGood: '#16A34A',
    progressWarning: '#D97706',
    progressAlert: '#DC2626',
    successSurface: '#ECFDF5',
    successText: '#047857',
    warningSurface: '#FEFCE8',
    warningText: '#92400E',
    alertSurface: '#FEF2F2',
    alertText: '#991B1B',
    divider: '#E0D9EA',
    shadow: '#E0D9EA',
    switchOff: '#EDE9FE',
    switchOn: '#8B5CF6',
    switchThumbOn: '#A78BFA',
    switchThumbOff: '#FFFFFF',
  },
};

export const appThemeOrder: AppThemeId[] = ['indigo', 'emerald', 'slate', 'cobalt', 'breeze', 'garden', 'coral', 'lavender', 'serenity', 'sage', 'warmclay', 'twilight'];

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
    surface: '#FFFAF0',
    bubble: '#FFC966',
    bubbleText: '#92400E',
    track: '#FFE4A3',
    fill: '#FACC15',
    border: '#FFD97D',
    chip: '#FEF3C7',
    chipText: '#92400E',
  },
  apricot: {
    surface: '#FFF5ED',
    bubble: '#FFBFA3',
    bubbleText: '#9A3412',
    track: '#FECACA',
    fill: '#F97316',
    border: '#FDBA74',
    chip: '#FFEDD5',
    chipText: '#9A3412',
  },
  clay: {
    surface: '#FEF1F0',
    bubble: '#FB8D6B',
    bubbleText: '#7C2D12',
    track: '#F87171',
    fill: '#DC2626',
    border: '#FECACA',
    chip: '#FEE2E2',
    chipText: '#7C2D12',
  },
  sun: {
    surface: '#FFFBEB',
    bubble: '#FCD34D',
    bubbleText: '#B45309',
    track: '#FDE047',
    fill: '#EAB308',
    border: '#FBBF24',
    chip: '#FEFCE8',
    chipText: '#B45309',
  },
  ember: {
    surface: '#FEF2F2',
    bubble: '#F97316',
    bubbleText: '#7C2D12',
    track: '#FB923C',
    fill: '#EA580C',
    border: '#FDBA74',
    chip: '#FFEDD5',
    chipText: '#7C2D12',
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

export const categoryGlyphs = {
  bag: '👜',
  baby: '👶',
  book: '📚',
  car: '🚗',
  cart: '🛒',
  cup: '☕',
  dot: '•',
  fuel: '⛽',
  game: '🎮',
  gift: '🎁',
  gym: '🏋️',
  heart: '❤️',
  home: '🏠',
  invest: '📈',
  movie: '🎬',
  music: '🎵',
  pet: '🐾',
  plane: '✈️',
  plus: '💊',
  repeat: '🔄',
  savings: '💰',
  wifi: '📱',
} as const;

export const getCategoryGlyph = (name: string) => {
  const normalized = name.trim().toLowerCase();

  if (/(grocery|food|market|farm|produce|supermarket)/.test(normalized)) {
    return 'cart';
  }

  if (/(rent|mortgage|home|house|utilities|electric|water|gas bill|household)/.test(normalized)) {
    return 'home';
  }

  if (/(fuel|petrol|diesel)/.test(normalized)) {
    return 'fuel';
  }

  if (/(transport|train|bus|car|uber|taxi|metro|commute|parking)/.test(normalized)) {
    return 'car';
  }

  if (/(flight|travel|holiday|vacation|trip|airport|hotel)/.test(normalized)) {
    return 'plane';
  }

  if (/(coffee|dining|restaurant|snack|bar|eat out|takeaway|takeout|lunch|dinner|brunch)/.test(normalized)) {
    return 'cup';
  }

  if (/(subscription|stream|netflix|spotify|phone|tech|internet|software)/.test(normalized)) {
    return 'wifi';
  }

  if (/(music|concert|gig|festival)/.test(normalized)) {
    return 'music';
  }

  if (/(movie|cinema|theatre|show|entertainment)/.test(normalized)) {
    return 'movie';
  }

  if (/(game|gaming|console|esport)/.test(normalized)) {
    return 'game';
  }

  if (/(gym|fitness|sport|yoga|pilates|swim|run|workout)/.test(normalized)) {
    return 'gym';
  }

  if (/(health|pharmacy|doctor|medical|dentist|hospital|clinic|medicine|supplement|vitamin|wellness)/.test(normalized)) {
    return 'heart';
  }

  if (/(shopping|clothes|fashion|style|apparel|footwear|accessories)/.test(normalized)) {
    return 'bag';
  }

  if (/(gift|present|donation|charity)/.test(normalized)) {
    return 'gift';
  }

  if (/(book|course|education|school|tuition|study|class|learn)/.test(normalized)) {
    return 'book';
  }

  if (/(pet|dog|cat|vet|animal)/.test(normalized)) {
    return 'pet';
  }

  if (/(baby|child|kid|childcare|nursery|nappy|diaper)/.test(normalized)) {
    return 'baby';
  }

  if (/(invest|stock|fund|brokerage|crypto|etf|isa|pension|retire)/.test(normalized)) {
    return 'invest';
  }

  if (/(save|saving|emergency|deposit|reserve)/.test(normalized)) {
    return 'savings';
  }

  if (/(health|pharmacy|doctor|wellness|gym|medicine|pill|prescription)/.test(normalized)) {
    return 'plus';
  }

  if (/(recurring|bills?|fixed costs?|monthly charges?|regular payments?)/.test(normalized)) {
    return 'repeat';
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

const normalizeAppThemeId = (value: unknown, fallback: AppThemeId = 'indigo'): AppThemeId =>
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
      appThemeId: 'indigo',
      cloudBackupEnabled: false,
      currencyCode: defaultCurrencyCode,
      languageCode: defaultLanguageCode,
      recentCurrencyCodes: [],
      recentLanguageCodes: [],
    };
  }

  return {
    appThemeId: normalizeAppThemeId(value.appThemeId),
    cloudBackupEnabled: typeof value.cloudBackupEnabled === 'boolean' ? value.cloudBackupEnabled : false,
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
    subcategory:
      typeof value.subcategory === 'string' && value.subcategory.trim()
        ? value.subcategory.trim()
        : undefined,
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
    version: 5,
    activeMonthId: monthId,
    months: [createEmptyMonth(monthId)],
    accounts: [],
    goals: [],
    preferences: {
      appThemeId: 'indigo',
      cloudBackupEnabled: false,
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
    version: 5,
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
      appThemeId: 'indigo',
      cloudBackupEnabled: false,
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

  if (value.version !== 2 && value.version !== 3 && value.version !== 4 && value.version !== 5) {
    return migrateLegacyDashboardState(value, referenceDate);
  }

  const preferences =
    value.version === 3 || value.version === 4 || value.version === 5
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
    version: 5,
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
