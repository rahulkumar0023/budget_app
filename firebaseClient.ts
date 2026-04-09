import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  initializeAuth,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type Persistence,
  type User,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import type { BudgetAppState } from './budgetModel';

const firebaseConfig = {
  apiKey: 'AIzaSyDHyP_m8HygrPos6NsvNFs_re8h8R48cPY',
  authDomain: 'budget-app-mobile-302e3.firebaseapp.com',
  projectId: 'budget-app-mobile-302e3',
  storageBucket: 'budget-app-mobile-302e3.firebasestorage.app',
  messagingSenderId: '275328336589',
  appId: '1:275328336589:web:e7750693d43060a2865f84',
  measurementId: 'G-76KVFHBNJW',
};

type AuthModule = typeof import('firebase/auth') & {
  getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
};

export type BudgetAuthUser = {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
};

export type BudgetAiSuggestionRequest = {
  adjustableCategories: Array<{
    bucket: string;
    left: number;
    name: string;
    planned: number;
    spent: number;
    tone: string;
  }>;
  adjustableCategoryCount: number;
  adjustableSpent: number;
  categoryCount: number;
  currencyCode: string;
  flexibleSpent: number;
  fixedCategoryCount: number;
  fixedShareRatio: number;
  flexibleCategoryCount: number;
  historyMonths: Array<{
    currencyCode: string;
    fixedShareRatio: number;
    label: string;
    planned: number;
    spent: number;
    utilizationRatio: number;
  }>;
  historyMixedCurrency: boolean;
  localeTag: string;
  monthId: string;
  monthLabel: string;
  monthlyLimit: number;
  overBudgetCategoryCount: number;
  planUsageRatio: number;
  recurringPlanned: number;
  recurringSpent: number;
  remaining: number;
  reviewCategories: Array<{
    bucket: string;
    left: number;
    name: string;
    planned: number;
    recurring: boolean;
    spent: number;
    tone: string;
  }>;
  savingsPlanned: number;
  totalPlanned: number;
  totalSpent: number;
};

export type BudgetAiMonthlyReviewRequest = BudgetAiSuggestionRequest;

export type BudgetAiSuggestionResponse = {
  actions: string[];
  headline: string;
  model: string;
  summary: string;
  watchout: string;
};

export type BudgetAiMonthlyReviewResponse = BudgetAiSuggestionResponse;

export type BudgetAiExpenseAssistRequest = {
  accounts: Array<{
    customKinds: string[];
    id: string;
    kinds: string[];
    name: string;
  }>;
  amount: number;
  categories: Array<{
    bucket: string;
    id: string;
    name: string;
    recurring: boolean;
    subcategories: string[];
  }>;
  currencyCode: string;
  localeTag: string;
  monthId: string;
  monthLabel: string;
  note: string;
  recentTransactions: Array<{
    accountName: string;
    amount: number;
    categoryName: string;
    note: string;
    recurring: boolean;
  }>;
};

export type BudgetAiExpenseAssistResponse = {
  accountId: string | null;
  categoryId: string;
  model: string;
  reason: string;
  recurring: boolean;
  subcategoryHint: string;
};

export type BudgetAiImportCleanupRequest = {
  accounts: Array<{
    customKinds: string[];
    kinds: string[];
    name: string;
    usageCount: number;
  }>;
  activeMonthId: string;
  activeMonthLabel: string;
  categories: Array<{
    averagePlanned: number;
    bucket: string;
    monthsUsed: number;
    name: string;
    recurringMonths: number;
    subcategories: string[];
  }>;
  currencyCode: string;
  historyMixedCurrency: boolean;
  localeTag: string;
  months: Array<{
    categoryCount: number;
    currencyCode: string;
    label: string;
    planUsageRatio: number;
    recurringShareRatio: number;
    transactionCount: number;
  }>;
};

export type BudgetAiImportCleanupResponse = {
  actions: string[];
  headline: string;
  mergeSuggestions: Array<{
    from: string;
    reason: string;
    to: string;
  }>;
  model: string;
  summary: string;
  watchout: string;
};

export type BudgetAiMonthPlannerRequest = {
  currencyCode: string;
  currentCategories: Array<{
    bucket: string;
    name: string;
    planned: number;
    recurring: boolean;
    subcategories: string[];
  }>;
  currentCategoryCount: number;
  historyCategories: Array<{
    averagePlanned: number;
    bucket: string;
    lastPlanned: number;
    monthsSeen: number;
    name: string;
    recurring: boolean;
    subcategories: string[];
  }>;
  localeTag: string;
  monthId: string;
  monthLabel: string;
  monthlyLimit: number;
};

export type BudgetAiMonthPlannerResponse = {
  actions: string[];
  headline: string;
  model: string;
  suggestedCategories: Array<{
    bucket: string;
    name: string;
    planned: number;
    reason: string;
    recurring: boolean;
    subcategories: string[];
  }>;
  summary: string;
  watchout: string;
};

const readTrimmedString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const getBudgetAiMonthlyReview = async (
  payload: BudgetAiMonthlyReviewRequest,
): Promise<BudgetAiMonthlyReviewResponse | null> => {
  const callBudgetAiMonthlyReview = httpsCallable<
    BudgetAiMonthlyReviewRequest,
    BudgetAiMonthlyReviewResponse
  >(functions, 'generateBudgetAiMonthlyReview');

  try {
    const result = await callBudgetAiMonthlyReview(payload);
    const data = result.data;

    if (
      !data ||
      typeof data.headline !== 'string' ||
      typeof data.summary !== 'string' ||
      typeof data.watchout !== 'string' ||
      !Array.isArray(data.actions) ||
      data.actions.some((item) => typeof item !== 'string')
    ) {
      return null;
    }

    return {
      actions: data.actions.slice(0, 3),
      headline: data.headline,
      model: typeof data.model === 'string' ? data.model : 'unknown',
      summary: data.summary,
      watchout: data.watchout,
    };
  } catch {
    return null;
  }
};

export const getBudgetAiSuggestions = async (
  payload: BudgetAiSuggestionRequest,
): Promise<BudgetAiSuggestionResponse | null> => {
  return getBudgetAiMonthlyReview(payload);
};

export const getBudgetAiExpenseAssist = async (
  payload: BudgetAiExpenseAssistRequest,
): Promise<BudgetAiExpenseAssistResponse | null> => {
  const callBudgetAiExpenseAssist = httpsCallable<
    BudgetAiExpenseAssistRequest,
    BudgetAiExpenseAssistResponse
  >(functions, 'generateBudgetAiExpenseAssist');

  try {
    const result = await callBudgetAiExpenseAssist(payload);
    const data = result.data;
    const categoryIds = new Set(payload.categories.map((category) => category.id));
    const accountIds = new Set(payload.accounts.map((account) => account.id));
    const categoryId = readTrimmedString(data?.categoryId);
    const accountId = readTrimmedString(data?.accountId);

    if (
      !categoryIds.has(categoryId) ||
      typeof data?.recurring !== 'boolean' ||
      typeof data?.reason !== 'string'
    ) {
      return null;
    }

    return {
      accountId: accountIds.has(accountId) ? accountId : null,
      categoryId,
      model: readTrimmedString(data?.model) || 'unknown',
      reason: data.reason.trim(),
      recurring: data.recurring,
      subcategoryHint: readTrimmedString(data?.subcategoryHint),
    };
  } catch {
    return null;
  }
};

export const getBudgetAiImportCleanup = async (
  payload: BudgetAiImportCleanupRequest,
): Promise<BudgetAiImportCleanupResponse | null> => {
  const callBudgetAiImportCleanup = httpsCallable<
    BudgetAiImportCleanupRequest,
    BudgetAiImportCleanupResponse
  >(functions, 'generateBudgetAiImportCleanup');

  try {
    const result = await callBudgetAiImportCleanup(payload);
    const data = result.data;

    if (
      !data ||
      typeof data.headline !== 'string' ||
      typeof data.summary !== 'string' ||
      typeof data.watchout !== 'string' ||
      !Array.isArray(data.actions) ||
      data.actions.some((item) => typeof item !== 'string') ||
      !Array.isArray(data.mergeSuggestions)
    ) {
      return null;
    }

    return {
      actions: data.actions.slice(0, 3),
      headline: data.headline.trim(),
      mergeSuggestions: data.mergeSuggestions
        .map((item) => ({
          from: readTrimmedString(item?.from),
          reason: readTrimmedString(item?.reason),
          to: readTrimmedString(item?.to),
        }))
        .filter((item) => item.from && item.to && item.reason)
        .slice(0, 3),
      model: readTrimmedString(data.model) || 'unknown',
      summary: data.summary.trim(),
      watchout: data.watchout.trim(),
    };
  } catch {
    return null;
  }
};

export const getBudgetAiMonthPlanner = async (
  payload: BudgetAiMonthPlannerRequest,
): Promise<BudgetAiMonthPlannerResponse | null> => {
  const callBudgetAiMonthPlanner = httpsCallable<
    BudgetAiMonthPlannerRequest,
    BudgetAiMonthPlannerResponse
  >(functions, 'generateBudgetAiMonthPlanner');

  try {
    const result = await callBudgetAiMonthPlanner(payload);
    const data = result.data;

    if (
      !data ||
      typeof data.headline !== 'string' ||
      typeof data.summary !== 'string' ||
      typeof data.watchout !== 'string' ||
      !Array.isArray(data.actions) ||
      data.actions.some((item) => typeof item !== 'string') ||
      !Array.isArray(data.suggestedCategories)
    ) {
      return null;
    }

    return {
      actions: data.actions.slice(0, 3),
      headline: data.headline.trim(),
      model: readTrimmedString(data.model) || 'unknown',
      suggestedCategories: data.suggestedCategories
        .map((item) => ({
          bucket: readTrimmedString(item?.bucket) || 'wants',
          name: readTrimmedString(item?.name),
          planned:
            typeof item?.planned === 'number'
              ? item.planned
              : Number.isFinite(Number(item?.planned))
                ? Number(item?.planned)
                : 0,
          reason: readTrimmedString(item?.reason),
          recurring: Boolean(item?.recurring),
          subcategories: isStringArray(item?.subcategories)
            ? item.subcategories.map((entry) => entry.trim()).filter(Boolean).slice(0, 4)
            : [],
        }))
        .filter(
          (item) =>
            item.name &&
            Number.isFinite(item.planned) &&
            item.planned > 0 &&
            ['needs', 'wants', 'savings'].includes(item.bucket),
        )
        .slice(0, 5),
      summary: data.summary.trim(),
      watchout: data.watchout.trim(),
    };
  } catch {
    return null;
  }
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const functions = getFunctions(app, 'europe-west1');

let authInstance: ReturnType<typeof getAuth> | null = null;

const getBudgetAuth = () => {
  if (authInstance) {
    return authInstance;
  }

  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
    return authInstance;
  }

  const authModule = require('firebase/auth') as AuthModule;

  try {
    if (authModule.getReactNativePersistence) {
      authInstance = initializeAuth(app, {
        persistence: authModule.getReactNativePersistence(AsyncStorage),
      });
    } else {
      authInstance = getAuth(app);
    }
  } catch {
    authInstance = getAuth(app);
  }

  return authInstance;
};

const toBudgetAuthUser = (user: User | null): BudgetAuthUser | null =>
  user
    ? {
        uid: user.uid,
        email: user.email,
        isAnonymous: user.isAnonymous,
      }
    : null;

export const ensureBudgetCloudUser = async () => {
  const auth = getBudgetAuth();

  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const credential = await signInAnonymously(auth);
  return credential.user.uid;
};

export const getCurrentBudgetUser = () => toBudgetAuthUser(getBudgetAuth().currentUser);

export const subscribeToBudgetAuth = (
  listener: (user: BudgetAuthUser | null) => void,
) => onAuthStateChanged(getBudgetAuth(), (user) => listener(toBudgetAuthUser(user)));

export const createBudgetPasswordAccount = async (email: string, password: string) => {
  const auth = getBudgetAuth();
  const normalizedEmail = email.trim().toLowerCase();
  const currentUser = auth.currentUser;

  if (currentUser?.isAnonymous) {
    const credential = EmailAuthProvider.credential(normalizedEmail, password);
    const linkedUser = await linkWithCredential(currentUser, credential);
    return {
      user: toBudgetAuthUser(linkedUser.user),
      linkedGuest: true,
    };
  }

  const createdUser = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  return {
    user: toBudgetAuthUser(createdUser.user),
    linkedGuest: false,
  };
};

export const signInBudgetPasswordUser = async (email: string, password: string) => {
  const auth = getBudgetAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return toBudgetAuthUser(credential.user);
};

export const sendBudgetPasswordReset = async (email: string) => {
  await sendPasswordResetEmail(getBudgetAuth(), email.trim().toLowerCase());
};

export const signOutBudgetUser = async () => {
  await signOut(getBudgetAuth());
};

export const deleteBudgetUserAccount = async (password: string) => {
  const auth = getBudgetAuth();
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.isAnonymous || !currentUser.email) {
    throw { code: 'auth/requires-recent-login' };
  }

  const normalizedPassword = password.trim();

  if (!normalizedPassword) {
    throw { code: 'auth/missing-password' };
  }

  const credential = EmailAuthProvider.credential(currentUser.email.trim().toLowerCase(), normalizedPassword);
  await reauthenticateWithCredential(currentUser, credential);

  await Promise.allSettled([
    deleteDoc(doc(firestore, 'users', currentUser.uid, 'budget', 'app')),
    deleteDoc(doc(firestore, 'users', currentUser.uid, 'budget', 'dashboard')),
  ]);

  await deleteUser(currentUser);
};

export const loadBudgetCloudState = async (userId: string): Promise<unknown | null> => {
  const appSnapshot = await getDoc(doc(firestore, 'users', userId, 'budget', 'app'));

  if (appSnapshot.exists()) {
    return appSnapshot.data();
  }

  const legacySnapshot = await getDoc(doc(firestore, 'users', userId, 'budget', 'dashboard'));

  if (!legacySnapshot.exists()) {
    return null;
  }

  return legacySnapshot.data();
};

export const saveBudgetCloudState = async (userId: string, state: BudgetAppState) => {
  await setDoc(doc(firestore, 'users', userId, 'budget', 'app'), state, { merge: false });
};
