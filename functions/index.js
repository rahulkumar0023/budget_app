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

const buildPrompt = (payload) => {
  const categoryLines = payload.reviewCategories
    .map(
      (category) =>
        `- ${category.name}: planned ${category.planned}, spent ${category.spent}, left ${category.left}, bucket ${category.bucket}, recurring ${category.recurring ? 'yes' : 'no'}, tone ${category.tone}`,
    )
    .join('\n');

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
- if recurring baseline is high, say the user may need to resize the total monthly target or rebalance flexible categories
- do not shame the user
- do not invent missing data
- if currencies differ across history, avoid direct raw-amount comparisons and focus on plan usage and mix
- keep the response concise and practical

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
- categories: ${payload.categoryCount}
- recurring planned: ${payload.recurringPlanned}
- recurring spent: ${payload.recurringSpent}
- flexible spent: ${payload.flexibleSpent}
- savings planned: ${payload.savingsPlanned}
- categories over plan: ${payload.overBudgetCategoryCount}

Current categories:
${categoryLines || '- No categories.'}

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
      categoryCount: Math.max(0, Math.round(toFiniteNumber(data.categoryCount))),
      currencyCode: normalizeText(data.currencyCode, 'USD'),
      flexibleSpent: toFiniteNumber(data.flexibleSpent),
      historyMonths: Array.isArray(data.historyMonths)
        ? data.historyMonths.map(normalizeHistoryMonth).filter(Boolean).slice(0, 4)
        : [],
      localeTag: normalizeText(data.localeTag, 'en-US'),
      monthId: normalizeText(data.monthId),
      monthLabel: normalizeText(data.monthLabel, 'This month'),
      monthlyLimit: toFiniteNumber(data.monthlyLimit),
      overBudgetCategoryCount: Math.max(0, Math.round(toFiniteNumber(data.overBudgetCategoryCount))),
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

      return {
        actions: parsed.actions
          .filter((item) => typeof item === 'string' && item.trim())
          .slice(0, 3),
        headline: parsed.headline.trim(),
        model: geminiModel,
        summary: parsed.summary.trim(),
        watchout: parsed.watchout.trim(),
      };
    } catch (error) {
      logger.error('Gemini monthly review failed', error);
      throw new HttpsError('internal', 'Monthly review could not be generated.');
    }
  },
);
