import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type Persistence,
  type User,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
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
  categoryCount: number;
  currencyCode: string;
  flexibleSpent: number;
  historyMonths: Array<{
    currencyCode: string;
    fixedShareRatio: number;
    label: string;
    planned: number;
    spent: number;
    utilizationRatio: number;
  }>;
  localeTag: string;
  monthId: string;
  monthLabel: string;
  monthlyLimit: number;
  overBudgetCategoryCount: number;
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

export const signOutBudgetUser = async () => {
  await signOut(getBudgetAuth());
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
