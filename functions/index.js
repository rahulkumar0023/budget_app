'use strict';

const { GoogleGenAI } = require('@google/genai');
const { defineSecret } = require('firebase-functions/params');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const geminiModel = 'gemini-2.5-flash-lite';

const toFiniteNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return fallback;
};

const normalizeText = (value, fallback = '') =>
  typeof value === 'string' ? value.trim() || fallback : fallback;

const normalizeTone = (value) => {
  const tone = normalizeText(value).toLowerCase();
  return ['good', 'warning', 'alert'].includes(tone) ? tone : 'good';
};

const normalizeCategory = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = value;
  const name = normalizeText(category.name);

  if (!name) {
    return null;
  }

  return {
    name,
    bucket: normalizeText(category.bucket, 'needs'),
    left: toFiniteNumber(category.left),
    planned: toFiniteNumber(category.planned),
    recurring: Boolean(category.recurring),
    spent: toFiniteNumber(category.spent),
    tone: normalizeTone(category.tone),
  };
};

const normalizeAdjustableCategory = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = value;
  const name = normalizeText(category.name);

  if (!name) {
    return null;
  }

  return {
    name,
    bucket: normalizeText(category.bucket, 'wants'),
    left: toFiniteNumber(category.left),
    planned: toFiniteNumber(category.planned),
    spent: toFiniteNumber(category.spent),
    tone: normalizeTone(category.tone),
  };
};

const normalizeHistoryMonth = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const month = value;
  const label = normalizeText(month.label);

  if (!label) {
    return null;
  }

  return {
    currencyCode: normalizeText(month.currencyCode, 'USD'),
    fixedShareRatio: toFiniteNumber(month.fixedShareRatio),
    label,
    planned: toFiniteNumber(month.planned),
    spent: toFiniteNumber(month.spent),
    utilizationRatio: toFiniteNumber(month.utilizationRatio),
  };
};

const buildFallbackActions = (payload) => {
  const actions = [];
  const topAdjustableCategory = payload.adjustableCategories[0] || null;

  if (topAdjustableCategory) {
    actions.push(`Review ${topAdjustableCategory.name} before any fixed costs.`);
  } else if (payload.adjustableSpent > 0) {
    actions.push('Focus on flexible categories before touching fixed costs.');
  } else {
    actions.push('Keep logging day-to-day spend before making cuts.');
  }

  if (payload.overBudgetCategoryCount > 0) {
    actions.push('Check the categories already running over plan.');
  } else if (payload.planUsageRatio >= 0.85) {
    actions.push('Watch next week closely as the month fills up.');
  } else {
    actions.push('Keep the current plan and monitor weekly pace.');
  }

  if (payload.historyMixedCurrency) {
    actions.push('Compare plan usage across months, not raw totals.');
  } else if (payload.fixedShareRatio >= 0.6) {
    actions.push('Resize the monthly target if fixed costs stay heavy.');
  } else {
    actions.push('Protect savings and reserve cuts for flexible spend.');
  }

  return actions.slice(0, 3);
};

const buildPrompt = (payload) => {
  const categoryLines = payload.reviewCategories
    .map(
      (category) =>
        `- ${category.name}: planned ${category.planned}, spent ${category.spent}, left ${category.left}, bucket ${category.bucket}, recurring ${category.recurring ? 'yes' : 'no'}, tone ${category.tone}`,
    )
    .join('\n');

  const adjustableCategoryLines =
    payload.adjustableCategories.length > 0
      ? payload.adjustableCategories
          .map(
            (category) =>
              `- ${category.name}: planned ${category.planned}, spent ${category.spent}, left ${category.left}, bucket ${category.bucket}, tone ${category.tone}`,
          )
          .join('\n')
      : '- No adjustable categories recorded yet.';

  const historyLines =
    payload.historyMonths.length > 0
      ? payload.historyMonths
          .map(
            (month) =>
              `- ${month.label}: currency ${month.currencyCode}, spent ${month.spent}, planned ${month.planned}, plan used ${Math.round(month.utilizationRatio * 100)}%, fixed share ${Math.round(month.fixedShareRatio * 100)}%`,
          )
          .join('\n')
      : '- No prior months included.';

  return `
You are reviewing one personal monthly budget.

Your job:
- explain the current month in plain language
- identify what is structurally healthy or under pressure
- give only realistic budget improvements

Hard rules:
- never recommend cutting fixed recurring costs as the first move
- never recommend cutting savings first unless the user clearly treats it as optional flexible money
- if recurring baseline is high, say the user may need to resize the total monthly target or rebalance flexible categories
- if adjustable spend is zero or close to zero, say there is little flexible spend to optimise yet
- do not shame the user
- do not invent missing data
- if history mixes currencies, avoid direct raw-amount comparisons and focus on plan usage and spend mix
- keep the response concise and practical
- actions must focus on adjustable categories, pacing, or target sizing
- if the month is mostly fixed, say that clearly

Return JSON only with:
- headline: short sentence
- summary: 2 sentence max
- watchout: one concrete risk or note
- actions: array of exactly 3 short action lines

Current month:
- month: ${payload.monthLabel} (${payload.monthId})
- currency: ${payload.currencyCode}
- locale: ${payload.localeTag}
- monthly limit: ${payload.monthlyLimit}
- total planned: ${payload.totalPlanned}
- total spent: ${payload.totalSpent}
- remaining: ${payload.remaining}
- plan usage ratio: ${Math.round(payload.planUsageRatio * 100)}%
- categories: ${payload.categoryCount}
- fixed category count: ${payload.fixedCategoryCount}
- flexible category count: ${payload.flexibleCategoryCount}
- recurring planned: ${payload.recurringPlanned}
- recurring spent: ${payload.recurringSpent}
- fixed share ratio: ${Math.round(payload.fixedShareRatio * 100)}%
- flexible spent: ${payload.flexibleSpent}
- adjustable spend: ${payload.adjustableSpent}
- adjustable category count: ${payload.adjustableCategoryCount}
- savings planned: ${payload.savingsPlanned}
- categories over plan: ${payload.overBudgetCategoryCount}
- mixed currencies in history: ${payload.historyMixedCurrency ? 'yes' : 'no'}

Current categories:
${categoryLines || '- No categories.'}

Adjustable categories to review:
${adjustableCategoryLines}

Recent month history:
${historyLines}
`.trim();
};

exports.generateBudgetAiMonthlyReview = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: [geminiApiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in is required before generating an AI review.');
    }

    const data = request.data && typeof request.data === 'object' ? request.data : null;

    if (!data) {
      throw new HttpsError('invalid-argument', 'Monthly review data is required.');
    }

    const payload = {
      adjustableCategories: Array.isArray(data.adjustableCategories)
        ? data.adjustableCategories.map(normalizeAdjustableCategory).filter(Boolean).slice(0, 5)
        : [],
      adjustableCategoryCount: Math.max(0, Math.round(toFiniteNumber(data.adjustableCategoryCount))),
      adjustableSpent: toFiniteNumber(data.adjustableSpent),
      categoryCount: Math.max(0, Math.round(toFiniteNumber(data.categoryCount))),
      currencyCode: normalizeText(data.currencyCode, 'USD'),
      flexibleSpent: toFiniteNumber(data.flexibleSpent),
      fixedCategoryCount: Math.max(0, Math.round(toFiniteNumber(data.fixedCategoryCount))),
      fixedShareRatio: toFiniteNumber(data.fixedShareRatio),
      flexibleCategoryCount: Math.max(0, Math.round(toFiniteNumber(data.flexibleCategoryCount))),
      historyMonths: Array.isArray(data.historyMonths)
        ? data.historyMonths.map(normalizeHistoryMonth).filter(Boolean).slice(0, 4)
        : [],
      historyMixedCurrency: Boolean(data.historyMixedCurrency),
      localeTag: normalizeText(data.localeTag, 'en-US'),
      monthId: normalizeText(data.monthId),
      monthLabel: normalizeText(data.monthLabel, 'This month'),
      monthlyLimit: toFiniteNumber(data.monthlyLimit),
      overBudgetCategoryCount: Math.max(0, Math.round(toFiniteNumber(data.overBudgetCategoryCount))),
      planUsageRatio: toFiniteNumber(data.planUsageRatio),
      recurringPlanned: toFiniteNumber(data.recurringPlanned),
      recurringSpent: toFiniteNumber(data.recurringSpent),
      remaining: toFiniteNumber(data.remaining),
      reviewCategories: Array.isArray(data.reviewCategories)
        ? data.reviewCategories.map(normalizeCategory).filter(Boolean).slice(0, 8)
        : [],
      savingsPlanned: toFiniteNumber(data.savingsPlanned),
      totalPlanned: toFiniteNumber(data.totalPlanned),
      totalSpent: toFiniteNumber(data.totalSpent),
    };

    if (!payload.monthId || payload.totalPlanned < 0 || payload.totalSpent < 0) {
      throw new HttpsError('invalid-argument', 'Monthly review data is incomplete.');
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: buildPrompt(payload),
        config: {
          temperature: 0.4,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              summary: { type: 'string' },
              watchout: { type: 'string' },
              actions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ['headline', 'summary', 'watchout', 'actions'],
          },
        },
      });

      const rawText =
        typeof response.text === 'string'
          ? response.text
          : typeof response.text === 'function'
            ? response.text()
            : '';
      const parsed = JSON.parse(rawText);

      if (
        !parsed ||
        typeof parsed.headline !== 'string' ||
        typeof parsed.summary !== 'string' ||
        typeof parsed.watchout !== 'string' ||
        !Array.isArray(parsed.actions)
      ) {
        throw new Error('Gemini returned an invalid review payload.');
      }

      const fallbackActions = buildFallbackActions(payload);
      const parsedActions = parsed.actions
        .filter((item) => typeof item === 'string' && item.trim())
        .slice(0, 3);

      return {
        actions:
          parsedActions.length === 3
            ? parsedActions
            : [...parsedActions, ...fallbackActions].slice(0, 3),
        headline: parsed.headline.trim() || 'Monthly review ready',
        model: geminiModel,
        summary: parsed.summary.trim() || 'The review is available, but the summary came back short.',
        watchout:
          parsed.watchout.trim() ||
          'Keep fixed recurring costs separate from flexible spending decisions.',
      };
    } catch (error) {
      logger.error('Gemini monthly review failed', error);
      throw new HttpsError('internal', 'Monthly review could not be generated.');
    }
  },
);

const normalizeBucket = (value, fallback = 'wants') => {
  const bucket = normalizeText(value, fallback).toLowerCase();
  return ['needs', 'wants', 'savings'].includes(bucket) ? bucket : fallback;
};

const normalizeStringList = (value, limit = 6) =>
  Array.isArray(value)
    ? value.map((entry) => normalizeText(entry)).filter(Boolean).slice(0, limit)
    : [];

const readResponseText = (response) =>
  typeof response?.text === 'function'
    ? response.text()
    : typeof response?.text === 'string'
      ? response.text
      : '';

const normalizeExpenseAssistCategory = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = value;
  const id = normalizeText(category.id);
  const name = normalizeText(category.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    bucket: normalizeBucket(category.bucket, 'wants'),
    recurring: Boolean(category.recurring),
    subcategories: normalizeStringList(category.subcategories, 8),
  };
};

const normalizeExpenseAssistAccount = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const account = value;
  const id = normalizeText(account.id);
  const name = normalizeText(account.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    kinds: normalizeStringList(account.kinds, 6),
    customKinds: normalizeStringList(account.customKinds, 6),
  };
};

const normalizeRecentExpenseExample = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const example = value;
  return {
    accountName: normalizeText(example.accountName),
    amount: toFiniteNumber(example.amount),
    categoryName: normalizeText(example.categoryName),
    note: normalizeText(example.note),
    recurring: Boolean(example.recurring),
  };
};

const normalizeCleanupMonth = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const month = value;
  const label = normalizeText(month.label);

  if (!label) {
    return null;
  }

  return {
    categoryCount: Math.max(0, Math.round(toFiniteNumber(month.categoryCount))),
    currencyCode: normalizeText(month.currencyCode, 'USD'),
    label,
    planUsageRatio: toFiniteNumber(month.planUsageRatio),
    recurringShareRatio: toFiniteNumber(month.recurringShareRatio),
    transactionCount: Math.max(0, Math.round(toFiniteNumber(month.transactionCount))),
  };
};

const normalizeCleanupCategory = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = value;
  const name = normalizeText(category.name);

  if (!name) {
    return null;
  }

  return {
    averagePlanned: toFiniteNumber(category.averagePlanned),
    bucket: normalizeBucket(category.bucket, 'wants'),
    monthsUsed: Math.max(0, Math.round(toFiniteNumber(category.monthsUsed))),
    name,
    recurringMonths: Math.max(0, Math.round(toFiniteNumber(category.recurringMonths))),
    subcategories: normalizeStringList(category.subcategories, 8),
  };
};

const normalizeCleanupAccount = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const account = value;
  const name = normalizeText(account.name);

  if (!name) {
    return null;
  }

  return {
    customKinds: normalizeStringList(account.customKinds, 6),
    kinds: normalizeStringList(account.kinds, 6),
    name,
    usageCount: Math.max(0, Math.round(toFiniteNumber(account.usageCount))),
  };
};

const normalizePlannerCategory = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = value;
  const name = normalizeText(category.name);

  if (!name) {
    return null;
  }

  return {
    bucket: normalizeBucket(category.bucket, 'wants'),
    name,
    planned: toFiniteNumber(category.planned),
    recurring: Boolean(category.recurring),
    subcategories: normalizeStringList(category.subcategories, 8),
  };
};

const normalizePlannerHistoryCategory = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = value;
  const name = normalizeText(category.name);

  if (!name) {
    return null;
  }

  return {
    averagePlanned: toFiniteNumber(category.averagePlanned),
    bucket: normalizeBucket(category.bucket, 'wants'),
    lastPlanned: toFiniteNumber(category.lastPlanned),
    monthsSeen: Math.max(0, Math.round(toFiniteNumber(category.monthsSeen))),
    name,
    recurring: Boolean(category.recurring),
    subcategories: normalizeStringList(category.subcategories, 8),
  };
};

const normalizeForLookup = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const findExactNoteExample = (payload) => {
  const normalizedNote = normalizeForLookup(payload.note);

  if (!normalizedNote) {
    return null;
  }

  return (
    payload.recentTransactions.find((transaction) => {
      const normalizedTransactionNote = normalizeForLookup(transaction.note);

      return (
        normalizedTransactionNote &&
        (normalizedTransactionNote === normalizedNote ||
          normalizedNote.includes(normalizedTransactionNote) ||
          normalizedTransactionNote.includes(normalizedNote))
      );
    }) ?? null
  );
};

const buildExpenseAssistFallback = (payload) => {
  const normalizedNote = normalizeForLookup(payload.note);
  const noteWords = normalizedNote.split(' ').filter(Boolean);
  const exactExample = findExactNoteExample(payload);

  let matchedCategory =
    payload.categories.find((category) => {
      const normalizedCategoryName = normalizeForLookup(category.name);

      if (normalizedCategoryName && normalizedNote.includes(normalizedCategoryName)) {
        return true;
      }

      return category.subcategories.some((subCategory) =>
        normalizedNote.includes(normalizeForLookup(subCategory)),
      );
    }) ?? null;

  if (!matchedCategory && exactExample) {
    matchedCategory =
      payload.categories.find(
        (category) =>
          normalizeForLookup(category.name) === normalizeForLookup(exactExample.categoryName),
      ) ?? null;
  }

  if (!matchedCategory && noteWords.length > 0) {
    matchedCategory =
      payload.categories.find((category) =>
        noteWords.some((word) => normalizeForLookup(category.name).includes(word)),
      ) ?? null;
  }

  if (!matchedCategory) {
    matchedCategory =
      payload.categories.find((category) => !category.recurring && category.bucket !== 'savings') ??
      payload.categories[0] ??
      null;
  }

  const matchedAccount =
    (exactExample
      ? payload.accounts.find(
          (account) => normalizeForLookup(account.name) === normalizeForLookup(exactExample.accountName),
        )
      : null) ??
    null;
  const subcategoryHint =
    matchedCategory?.subcategories.find((subCategory) =>
      normalizedNote.includes(normalizeForLookup(subCategory)),
    ) ?? '';

  return {
    accountId: matchedAccount?.id ?? '',
    categoryId: matchedCategory?.id ?? payload.categories[0]?.id ?? '',
    reason: exactExample
      ? `Matched a recent expense similar to "${exactExample.note || exactExample.categoryName}".`
      : matchedCategory
        ? `Closest fit based on the note and your existing categories.`
        : 'Pick the closest category manually if this suggestion feels off.',
    recurring: exactExample ? exactExample.recurring : matchedCategory?.recurring ?? false,
    subcategoryHint,
  };
};

const buildExpenseAssistPrompt = (payload) => {
  const categoryLines = payload.categories
    .map(
      (category) =>
        `- ${category.id}: ${category.name} | bucket ${category.bucket} | recurring ${category.recurring ? 'yes' : 'no'} | subcategories ${category.subcategories.join(', ') || 'none'}`,
    )
    .join('\n');
  const accountLines =
    payload.accounts.length > 0
      ? payload.accounts
          .map(
            (account) =>
              `- ${account.id}: ${account.name} | kinds ${account.kinds.join(', ') || 'none'} | custom ${account.customKinds.join(', ') || 'none'}`,
          )
          .join('\n')
      : '- No bank accounts supplied.';
  const recentLines =
    payload.recentTransactions.length > 0
      ? payload.recentTransactions
          .map(
            (transaction) =>
              `- ${transaction.note || '(no note)'} | ${transaction.amount} | category ${transaction.categoryName} | account ${transaction.accountName || 'none'} | recurring ${transaction.recurring ? 'yes' : 'no'}`,
          )
          .join('\n')
      : '- No recent examples supplied.';

  return `
You classify one budget expense.

Rules:
- return JSON only
- choose categoryId only from the provided categories
- choose accountId only from the provided accounts, or return an empty string if unclear
- recurring means this expense is likely to repeat next month, not merely that it happened in a recurring category
- prefer recent examples when the note is similar
- do not invent categories, accounts, or ids
- keep reason short and plain
- use subcategoryHint only when it genuinely helps

Return:
- categoryId: string
- accountId: string
- recurring: boolean
- subcategoryHint: string
- reason: string

Expense:
- month: ${payload.monthLabel} (${payload.monthId})
- currency: ${payload.currencyCode}
- locale: ${payload.localeTag}
- amount: ${payload.amount}
- note: ${payload.note || '(empty)'}

Categories:
${categoryLines}

Accounts:
${accountLines}

Recent examples:
${recentLines}
  `.trim();
};

const buildCleanupFallback = (payload) => {
  const broadRecurringCategory = payload.categories.find(
    (category) =>
      normalizeForLookup(category.name).includes('recurring') ||
      normalizeForLookup(category.name).includes('flex'),
  );

  return {
    actions: [
      broadRecurringCategory
        ? `Keep ${broadRecurringCategory.name} if it matches your money-flow setup, but tighten its subcategories over time.`
        : 'Tighten category naming only where it improves clarity.',
      payload.historyMixedCurrency
        ? 'Compare plan-usage ratios across months instead of raw totals while currencies differ.'
        : 'Use month-to-month comparisons to spot categories drifting upward.',
      payload.accounts.length > 0
        ? 'Keep bank account tags clean so imports and activity filters stay useful.'
        : 'Add account tags only when they help you explain cash flow.',
    ],
    headline: 'Cleanup review is ready',
    mergeSuggestions: [],
    summary: 'The current structure is usable. Clean up only naming drift, duplicate lanes, or weak recurring tags.',
    watchout:
      'Avoid forcing a classic budget structure if broad lanes like recurring or daily spending match how you actually move money.',
  };
};

const buildCleanupPrompt = (payload) => {
  const monthLines =
    payload.months.length > 0
      ? payload.months
          .map(
            (month) =>
              `- ${month.label}: currency ${month.currencyCode}, categories ${month.categoryCount}, transactions ${month.transactionCount}, plan used ${Math.round(month.planUsageRatio * 100)}%, recurring share ${Math.round(month.recurringShareRatio * 100)}%`,
          )
          .join('\n')
      : '- No month history supplied.';
  const categoryLines =
    payload.categories.length > 0
      ? payload.categories
          .map(
            (category) =>
              `- ${category.name}: bucket ${category.bucket}, avg planned ${category.averagePlanned}, months used ${category.monthsUsed}, recurring months ${category.recurringMonths}, subcategories ${category.subcategories.join(', ') || 'none'}`,
          )
          .join('\n')
      : '- No categories supplied.';
  const accountLines =
    payload.accounts.length > 0
      ? payload.accounts
          .map(
            (account) =>
              `- ${account.name}: kinds ${account.kinds.join(', ') || 'none'}, custom ${account.customKinds.join(', ') || 'none'}, used ${account.usageCount} times`,
          )
          .join('\n')
      : '- No accounts supplied.';

  return `
You review imported budget data and naming quality.

Rules:
- return JSON only
- respect account-flow budgeting structures if they look intentional
- do not push the user toward a classic category tree unless the current naming is clearly confusing
- suggest merges only when two names are likely duplicates or near-duplicates
- never recommend cutting fixed recurring costs here
- if history mixes currencies, avoid raw-amount comparisons
- keep the review concise and practical

Return:
- headline: string
- summary: string
- watchout: string
- actions: array of exactly 3 short lines
- mergeSuggestions: array with up to 3 items, each { from, to, reason }

Budget context:
- active month: ${payload.activeMonthLabel} (${payload.activeMonthId})
- currency: ${payload.currencyCode}
- locale: ${payload.localeTag}
- mixed currencies in history: ${payload.historyMixedCurrency ? 'yes' : 'no'}

Months:
${monthLines}

Categories:
${categoryLines}

Accounts:
${accountLines}
  `.trim();
};

const buildPlannerFallback = (payload) => {
  const existingNames = new Set(payload.currentCategories.map((category) => normalizeForLookup(category.name)));
  const suggestedCategories = payload.historyCategories
    .filter((category) => !existingNames.has(normalizeForLookup(category.name)))
    .sort(
      (left, right) =>
        right.monthsSeen - left.monthsSeen ||
        Number(right.recurring) - Number(left.recurring) ||
        right.lastPlanned - left.lastPlanned,
    )
    .slice(0, 4)
    .map((category) => ({
      bucket: category.bucket,
      name: category.name,
      planned: category.lastPlanned > 0 ? category.lastPlanned : category.averagePlanned,
      reason: `Used in ${category.monthsSeen} prior month${category.monthsSeen === 1 ? '' : 's'}.`,
      recurring: category.recurring,
      subcategories: category.subcategories.slice(0, 4),
    }));

  return {
    actions: [
      'Carry forward the stable lanes first, then add flexible categories.',
      'Keep categories broad and use subcategories for the detail.',
      'Only add new lanes when they help you make decisions later.',
    ],
    headline: suggestedCategories.length > 0 ? 'Starter plan suggestions are ready' : 'Planner needs more history',
    suggestedCategories,
    summary:
      suggestedCategories.length > 0
        ? 'These suggestions come from the categories you have used before. Apply only the lanes that still fit this month.'
        : 'There is not enough prior category history yet to suggest a clean starter plan.',
    watchout:
      'Do not duplicate categories you already have. Use suggestions to prefill the form, then adjust before saving.',
  };
};

const buildPlannerPrompt = (payload) => {
  const currentCategoryLines =
    payload.currentCategories.length > 0
      ? payload.currentCategories
          .map(
            (category) =>
              `- ${category.name}: planned ${category.planned}, bucket ${category.bucket}, recurring ${category.recurring ? 'yes' : 'no'}, subcategories ${category.subcategories.join(', ') || 'none'}`,
          )
          .join('\n')
      : '- No current categories yet.';
  const historyLines =
    payload.historyCategories.length > 0
      ? payload.historyCategories
          .map(
            (category) =>
              `- ${category.name}: avg planned ${category.averagePlanned}, last planned ${category.lastPlanned}, months seen ${category.monthsSeen}, bucket ${category.bucket}, recurring ${category.recurring ? 'yes' : 'no'}, subcategories ${category.subcategories.join(', ') || 'none'}`,
          )
          .join('\n')
      : '- No category history supplied.';

  return `
You suggest a compact month-start budget plan.

Rules:
- return JSON only
- suggest 3 to 5 categories max
- keep categories broad; use subcategories only when helpful
- do not duplicate any current category name
- keep recurring true only for categories that are likely stable commitments
- respect prior history instead of inventing a totally new structure
- keep actions short and practical

Return:
- headline: string
- summary: string
- watchout: string
- actions: array of exactly 3 short lines
- suggestedCategories: array of 3 to 5 items with { name, planned, bucket, recurring, subcategories, reason }

Current month:
- month: ${payload.monthLabel} (${payload.monthId})
- currency: ${payload.currencyCode}
- locale: ${payload.localeTag}
- monthly limit: ${payload.monthlyLimit}
- current category count: ${payload.currentCategoryCount}

Current categories:
${currentCategoryLines}

History categories:
${historyLines}
  `.trim();
};

exports.generateBudgetAiExpenseAssist = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: [geminiApiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in is required before generating an AI expense suggestion.');
    }

    const data = request.data && typeof request.data === 'object' ? request.data : null;

    if (!data) {
      throw new HttpsError('invalid-argument', 'Expense suggestion data is required.');
    }

    const payload = {
      accounts: Array.isArray(data.accounts)
        ? data.accounts.map(normalizeExpenseAssistAccount).filter(Boolean).slice(0, 10)
        : [],
      amount: toFiniteNumber(data.amount),
      categories: Array.isArray(data.categories)
        ? data.categories.map(normalizeExpenseAssistCategory).filter(Boolean).slice(0, 20)
        : [],
      currencyCode: normalizeText(data.currencyCode, 'USD'),
      localeTag: normalizeText(data.localeTag, 'en-US'),
      monthId: normalizeText(data.monthId),
      monthLabel: normalizeText(data.monthLabel, 'This month'),
      note: normalizeText(data.note),
      recentTransactions: Array.isArray(data.recentTransactions)
        ? data.recentTransactions.map(normalizeRecentExpenseExample).filter(Boolean).slice(0, 12)
        : [],
    };

    if (!payload.monthId || payload.amount <= 0 || payload.categories.length === 0) {
      throw new HttpsError('invalid-argument', 'Expense suggestion data is incomplete.');
    }

    const fallback = buildExpenseAssistFallback(payload);

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: buildExpenseAssistPrompt(payload),
        config: {
          temperature: 0.2,
          maxOutputTokens: 300,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              accountId: { type: 'string' },
              categoryId: { type: 'string' },
              reason: { type: 'string' },
              recurring: { type: 'boolean' },
              subcategoryHint: { type: 'string' },
            },
            required: ['accountId', 'categoryId', 'reason', 'recurring', 'subcategoryHint'],
          },
        },
      });

      const parsed = JSON.parse(readResponseText(response));
      const validCategory = payload.categories.some((category) => category.id === normalizeText(parsed.categoryId));
      const validAccount =
        !normalizeText(parsed.accountId) ||
        payload.accounts.some((account) => account.id === normalizeText(parsed.accountId));

      if (!validCategory || !validAccount || typeof parsed.recurring !== 'boolean') {
        throw new Error('Gemini returned an invalid expense assist payload.');
      }

      return {
        accountId: normalizeText(parsed.accountId),
        categoryId: normalizeText(parsed.categoryId),
        model: geminiModel,
        reason: normalizeText(parsed.reason, fallback.reason),
        recurring: parsed.recurring,
        subcategoryHint: normalizeText(parsed.subcategoryHint),
      };
    } catch (error) {
      logger.error('Gemini expense assist failed', error);
      return {
        ...fallback,
        model: geminiModel,
      };
    }
  },
);

exports.generateBudgetAiImportCleanup = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: [geminiApiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in is required before generating an AI cleanup review.');
    }

    const data = request.data && typeof request.data === 'object' ? request.data : null;

    if (!data) {
      throw new HttpsError('invalid-argument', 'Cleanup review data is required.');
    }

    const payload = {
      accounts: Array.isArray(data.accounts)
        ? data.accounts.map(normalizeCleanupAccount).filter(Boolean).slice(0, 12)
        : [],
      activeMonthId: normalizeText(data.activeMonthId),
      activeMonthLabel: normalizeText(data.activeMonthLabel, 'Active month'),
      categories: Array.isArray(data.categories)
        ? data.categories.map(normalizeCleanupCategory).filter(Boolean).slice(0, 20)
        : [],
      currencyCode: normalizeText(data.currencyCode, 'USD'),
      historyMixedCurrency: Boolean(data.historyMixedCurrency),
      localeTag: normalizeText(data.localeTag, 'en-US'),
      months: Array.isArray(data.months)
        ? data.months.map(normalizeCleanupMonth).filter(Boolean).slice(0, 6)
        : [],
    };

    if (!payload.activeMonthId || payload.categories.length === 0) {
      throw new HttpsError('invalid-argument', 'Cleanup review data is incomplete.');
    }

    const fallback = buildCleanupFallback(payload);

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: buildCleanupPrompt(payload),
        config: {
          temperature: 0.35,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              summary: { type: 'string' },
              watchout: { type: 'string' },
              actions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 3,
              },
              mergeSuggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    reason: { type: 'string' },
                    to: { type: 'string' },
                  },
                  required: ['from', 'reason', 'to'],
                },
              },
            },
            required: ['headline', 'summary', 'watchout', 'actions', 'mergeSuggestions'],
          },
        },
      });

      const parsed = JSON.parse(readResponseText(response));
      const parsedActions = Array.isArray(parsed.actions)
        ? parsed.actions.filter((item) => typeof item === 'string' && item.trim()).slice(0, 3)
        : [];
      const parsedMergeSuggestions = Array.isArray(parsed.mergeSuggestions)
        ? parsed.mergeSuggestions
            .map((item) => ({
              from: normalizeText(item?.from),
              reason: normalizeText(item?.reason),
              to: normalizeText(item?.to),
            }))
            .filter((item) => item.from && item.to && item.reason)
            .slice(0, 3)
        : [];

      return {
        actions:
          parsedActions.length === 3
            ? parsedActions
            : [...parsedActions, ...fallback.actions].slice(0, 3),
        headline: normalizeText(parsed.headline, fallback.headline),
        mergeSuggestions: parsedMergeSuggestions,
        model: geminiModel,
        summary: normalizeText(parsed.summary, fallback.summary),
        watchout: normalizeText(parsed.watchout, fallback.watchout),
      };
    } catch (error) {
      logger.error('Gemini import cleanup failed', error);
      return {
        ...fallback,
        model: geminiModel,
      };
    }
  },
);

exports.generateBudgetAiMonthPlanner = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: [geminiApiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in is required before generating an AI month plan.');
    }

    const data = request.data && typeof request.data === 'object' ? request.data : null;

    if (!data) {
      throw new HttpsError('invalid-argument', 'Month planner data is required.');
    }

    const payload = {
      currencyCode: normalizeText(data.currencyCode, 'USD'),
      currentCategories: Array.isArray(data.currentCategories)
        ? data.currentCategories.map(normalizePlannerCategory).filter(Boolean).slice(0, 20)
        : [],
      currentCategoryCount: Math.max(0, Math.round(toFiniteNumber(data.currentCategoryCount))),
      historyCategories: Array.isArray(data.historyCategories)
        ? data.historyCategories.map(normalizePlannerHistoryCategory).filter(Boolean).slice(0, 20)
        : [],
      localeTag: normalizeText(data.localeTag, 'en-US'),
      monthId: normalizeText(data.monthId),
      monthLabel: normalizeText(data.monthLabel, 'This month'),
      monthlyLimit: toFiniteNumber(data.monthlyLimit),
    };

    if (!payload.monthId || payload.monthlyLimit <= 0) {
      throw new HttpsError('invalid-argument', 'Month planner data is incomplete.');
    }

    const fallback = buildPlannerFallback(payload);

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: buildPlannerPrompt(payload),
        config: {
          temperature: 0.35,
          maxOutputTokens: 650,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              summary: { type: 'string' },
              watchout: { type: 'string' },
              actions: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 3,
              },
              suggestedCategories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    bucket: { type: 'string' },
                    name: { type: 'string' },
                    planned: { type: 'number' },
                    reason: { type: 'string' },
                    recurring: { type: 'boolean' },
                    subcategories: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['bucket', 'name', 'planned', 'reason', 'recurring', 'subcategories'],
                },
              },
            },
            required: ['headline', 'summary', 'watchout', 'actions', 'suggestedCategories'],
          },
        },
      });

      const parsed = JSON.parse(readResponseText(response));
      const parsedActions = Array.isArray(parsed.actions)
        ? parsed.actions.filter((item) => typeof item === 'string' && item.trim()).slice(0, 3)
        : [];
      const existingNames = new Set(
        payload.currentCategories.map((category) => normalizeForLookup(category.name)),
      );
      const parsedCategories = Array.isArray(parsed.suggestedCategories)
        ? parsed.suggestedCategories
            .map((item) => ({
              bucket: normalizeBucket(item?.bucket, 'wants'),
              name: normalizeText(item?.name),
              planned: toFiniteNumber(item?.planned),
              reason: normalizeText(item?.reason),
              recurring: Boolean(item?.recurring),
              subcategories: normalizeStringList(item?.subcategories, 6),
            }))
            .filter(
              (item) =>
                item.name &&
                item.planned > 0 &&
                !existingNames.has(normalizeForLookup(item.name)),
            )
            .slice(0, 5)
        : [];

      return {
        actions:
          parsedActions.length === 3
            ? parsedActions
            : [...parsedActions, ...fallback.actions].slice(0, 3),
        headline: normalizeText(parsed.headline, fallback.headline),
        model: geminiModel,
        suggestedCategories:
          parsedCategories.length > 0 ? parsedCategories : fallback.suggestedCategories,
        summary: normalizeText(parsed.summary, fallback.summary),
        watchout: normalizeText(parsed.watchout, fallback.watchout),
      };
    } catch (error) {
      logger.error('Gemini month planner failed', error);
      return {
        ...fallback,
        model: geminiModel,
      };
    }
  },
);
