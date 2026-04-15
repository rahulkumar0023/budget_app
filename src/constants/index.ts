import { type CategoryBucket, type AppThemeId } from '../../budgetModel';

export const PREMIUM_PAYWALL_DISMISS_KEY = 'budget-buddy:premium-paywall-dismissed:v1';
export const QUICK_START_PRESET_COUNT = 3;
export const MAX_RECENT_EXPENSE_TEMPLATES = 4;
export const MAX_RECENT_CATEGORY_SHORTCUTS = 4;
export const MAX_RECENT_SELECTOR_ITEMS = 6;

export const insightWindowMeta = {
  quarter: { label: 'Quarter', months: 3 },
  half: { label: '6 months', months: 6 },
  year: { label: 'Year', months: 12 },
} as const;

export type InsightWindow = keyof typeof insightWindowMeta;

export const budgetSetupStepMeta = {
  limit: {
    label: 'Budget',
    title: 'Budget amount',
    subtitle: 'Set the amount first.',
  },
  categories: {
    label: 'Categories',
    title: 'Categories',
    subtitle: 'Start broad, then add detail only when needed.',
  },
  review: {
    label: 'Review',
    title: 'Review',
    subtitle: 'Check the balance before you start spending.',
  },
} as const;

export type BudgetSetupStep = keyof typeof budgetSetupStepMeta;
export const budgetSetupSteps: BudgetSetupStep[] = ['limit', 'categories', 'review'];

export const paywallSourceMeta = {
  ai_expense_assist: {
    title: 'Get smarter expense suggestions',
    subtitle: 'Let the app suggest the right category, account, and repeat flag before you save.',
  },
  ai_import_cleanup: {
    title: 'Unlock smart tidy-up',
    subtitle: 'Scan imported categories for duplicates, naming drift, and repeat labels before the budget gets messy.',
  },
  ai_review: {
    title: 'Unlock monthly check-ins',
    subtitle: 'Get a quick end-of-month read that separates fixed bills from flexible spend.',
  },
  ai_starter_plan: {
    title: 'Unlock starter hints',
    subtitle: 'Pull likely category lanes from earlier months, then keep only the ones that still fit.',
  },
  backup_toggle: {
    title: 'Unlock recoverable backup',
    subtitle: 'Keep budgeting free and local, then turn on a recovery backup only when you want reinstall protection.',
  },
  settings_upgrade: {
    title: 'Upgrade to Budget Buddy Premium',
    subtitle: 'Unlock AI budgeting help and optional recovery backup without changing the local-first core app.',
  },
  setup_complete: {
    title: 'Keep the budget working harder for you',
    subtitle: 'The month is ready. Premium adds quick check-ins, smarter suggestions, and recoverable backup when you need it.',
  },
} as const;

export type PaywallSource = keyof typeof paywallSourceMeta;
