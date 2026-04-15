import { parseMonthId, getLocaleTag } from '../../budgetModel';

export const getMonthBounds = (monthId: string) => {
  const monthDate = parseMonthId(monthId);
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12, 0, 0);

  return { start, end };
};

export const clampDateToMonth = (date: Date, monthId: string) => {
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

export const getDefaultExpenseDate = (monthId: string, referenceDate = new Date()) =>
  clampDateToMonth(referenceDate, monthId);

export const formatExpenseDate = (date: Date, locale = getLocaleTag()) =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

export const getInsightWeekBucket = (date: Date) => {
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

export const getStartOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const getEndOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const getStartOfWeek = (date: Date) => {
  const next = getStartOfDay(date);
  const dayOffset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - dayOffset);
  return next;
};

export const getEndOfWeek = (date: Date) => {
  const next = getStartOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
};
