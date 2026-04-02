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
  averageMonthlySpend: number;
  currencyCode: string;
  localeTag: string;
  monthCount: number;
  months: Array<{
    label: string;
    planned: number;
    spent: number;
  }>;
  overBudgetMonths: number;
  topCategory: { name: string; spent: number } | null;
  totalPlanned: number;
  totalSpent: number;
  trendDelta: number | null;
  windowLabel: string;
};

export type BudgetAiSuggestionResponse = {
  model: string;
  suggestions: string[];
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

export const getBudgetAiSuggestions = async (
  payload: BudgetAiSuggestionRequest,
): Promise<BudgetAiSuggestionResponse | null> => {
  const callBudgetAiSuggestions = httpsCallable<
    BudgetAiSuggestionRequest,
    BudgetAiSuggestionResponse
  >(functions, 'generateBudgetAiSuggestions');

  try {
    const result = await callBudgetAiSuggestions(payload);
    const data = result.data;

    if (
      !data ||
      !Array.isArray(data.suggestions) ||
      data.suggestions.some((item) => typeof item !== 'string')
    ) {
      return null;
    }

    return {
      model: typeof data.model === 'string' ? data.model : 'unknown',
      suggestions: data.suggestions.slice(0, 3),
    };
  } catch {
    return null;
  }
};
