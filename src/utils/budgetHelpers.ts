import {
  type Transaction,
  type Category,
  type CategoryBucket,
  categoryGlyphs,
  getCategoryGlyph,
} from '../../budgetModel';

export const getTransactionDisplayTitle = (
  transaction: Transaction,
  fallbackCategoryName?: string | null,
) => transaction.note.trim() || transaction.subcategory || fallbackCategoryName || 'Expense';

export const findMatchingSubcategory = (subcategories: string[], candidate?: string | null) => {
  if (!candidate) {
    return '';
  }

  const normalizedCandidate = candidate.trim().toLowerCase();
  if (!normalizedCandidate) {
    return '';
  }

  const exactMatch = subcategories.find(
    (subcategory) => subcategory.trim().toLowerCase() === normalizedCandidate,
  );

  if (exactMatch) {
    return exactMatch;
  }

  return (
    subcategories.find((subcategory) => {
      const normalizedSubcategory = subcategory.trim().toLowerCase();
      return (
        normalizedCandidate.includes(normalizedSubcategory) ||
        normalizedSubcategory.includes(normalizedCandidate)
      );
    }) ?? ''
  );
};

export const resolveExpenseSubcategory = (
  category: Category | null | undefined,
  candidate?: string | null,
  { preferSingle = false }: { preferSingle?: boolean } = {},
) => {
  if (!category) {
    return '';
  }

  const matched = findMatchingSubcategory(category.subcategories, candidate);
  if (matched) {
    return matched;
  }

  if (preferSingle && category.subcategories.length === 1) {
    return category.subcategories[0];
  }

  return '';
};

export const budgetBucketTargetRatio: Record<CategoryBucket, number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
};

export const getCategoryIcon = (name: string) => {
  const glyph = getCategoryGlyph(name);
  if (glyph === 'dot') {
    return name.trim().charAt(0).toUpperCase() || '•';
  }
  return categoryGlyphs[glyph];
};

export const getSuggestedBudgetSetupStep = (
  monthlyLimit: number,
  categoryCount: number,
  allocationDifference: number,
) => {
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
