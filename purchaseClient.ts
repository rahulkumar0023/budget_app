import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

export const PREMIUM_ENTITLEMENT_ID = 'premium';
export const PREMIUM_MONTHLY_PRODUCT_ID = 'premium_monthly';
export const PREMIUM_YEARLY_PRODUCT_ID = 'premium_yearly';

export type PremiumStatus = 'free' | 'premium' | 'unknown';
export type PurchaseState = 'loading' | 'ready' | 'error';
export type PremiumPackageKind = 'annual' | 'monthly' | 'other';

export type PremiumPackageOption = {
  id: string;
  description: string;
  highlight: string | null;
  kind: PremiumPackageKind;
  perMonthLabel: string | null;
  priceLabel: string;
  title: string;
};

export type PurchaseSnapshot = {
  appUserId: string | null;
  currentOfferingId: string | null;
  currentOfferingDescription: string;
  isAvailable: boolean;
  isConfigured: boolean;
  lastError: string | null;
  managementUrl: string | null;
  packages: PremiumPackageOption[];
  premiumStatus: PremiumStatus;
  purchaseState: PurchaseState;
};

const revenueCatTestApiKey = 'test_DLYtmcpvinPLJzUhZJubbMuNMQk';
const iosApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ||
  (__DEV__ ? revenueCatTestApiKey : '');
const androidApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ||
  (__DEV__ ? revenueCatTestApiKey : '');
const appleManageSubscriptionsUrl = 'https://apps.apple.com/account/subscriptions';

let configured = false;
let cachedAppUserId: string | null = null;
let cachedCustomerInfo: CustomerInfo | null = null;
let cachedOffering: PurchasesOffering | null = null;
let cachedStoreProducts: PurchasesStoreProduct[] = [];
let cachedLastError: string | null = null;
let customerInfoListenerAttached = false;

const packageCache = new Map<string, PurchasesPackage>();
const productCache = new Map<string, PurchasesStoreProduct>();
const snapshotListeners = new Set<(snapshot: PurchaseSnapshot) => void>();

const getUnavailableMessage = () => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return 'Subscriptions are available on iOS and Android only right now.';
  }

  if (!getRevenueCatApiKey()) {
    return __DEV__
      ? 'RevenueCat API key is missing. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY, then restart Expo.'
      : 'Premium is unavailable right now.';
  }

  return 'Premium is unavailable right now.';
};

const getRevenueCatApiKey = () => {
  if (Platform.OS === 'ios') {
    return iosApiKey;
  }

  if (Platform.OS === 'android') {
    return androidApiKey;
  }

  return '';
};

const canUseRevenueCat = Boolean(getRevenueCatApiKey());

const normalizeRevenueCatError = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  const candidate = error as { userCancelled?: boolean; code?: string; message?: string } | null;

  if (candidate?.userCancelled) {
    return 'Purchase cancelled.';
  }

  if (typeof candidate?.message === 'string' && candidate.message.trim()) {
    return candidate.message.trim();
  }

  if (typeof candidate?.code === 'string' && candidate.code.trim()) {
    return candidate.code.trim();
  }

  return 'Subscriptions are unavailable right now.';
};

const buildSavingsHighlight = (annualPackage: PurchasesPackage, monthlyPackage: PurchasesPackage) => {
  const annualPrice = annualPackage.product.price;
  const monthlyPrice = monthlyPackage.product.price;

  if (!Number.isFinite(annualPrice) || !Number.isFinite(monthlyPrice) || annualPrice <= 0 || monthlyPrice <= 0) {
    return 'Best value';
  }

  const yearlyMonthlyCost = monthlyPrice * 12;

  if (yearlyMonthlyCost <= annualPrice) {
    return 'Best value';
  }

  const savingsRatio = (yearlyMonthlyCost - annualPrice) / yearlyMonthlyCost;
  const savingsPercent = Math.round(savingsRatio * 100);

  return savingsPercent > 0 ? `Save ${savingsPercent}%` : 'Best value';
};

const normalizeIdentifier = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

const getPackageKind = (
  revenueCatPackage: PurchasesPackage | null | undefined,
  fallback: PremiumPackageKind = 'other',
): PremiumPackageKind => {
  if (!revenueCatPackage) {
    return fallback;
  }

  const packageIdentifier = normalizeIdentifier(revenueCatPackage.identifier);
  const productIdentifier = normalizeIdentifier(revenueCatPackage.product.identifier);
  const subscriptionPeriod = normalizeIdentifier(revenueCatPackage.product.subscriptionPeriod);
  const packageType = normalizeIdentifier(String(revenueCatPackage.packageType));

  if (
    packageIdentifier.includes('year') ||
    packageIdentifier.includes('annual') ||
    productIdentifier === PREMIUM_YEARLY_PRODUCT_ID ||
    productIdentifier.includes('year') ||
    productIdentifier.includes('annual') ||
    packageType === 'annual' ||
    subscriptionPeriod === 'p1y'
  ) {
    return 'annual';
  }

  if (
    packageIdentifier.includes('month') ||
    productIdentifier === PREMIUM_MONTHLY_PRODUCT_ID ||
    productIdentifier.includes('month') ||
    packageType === 'monthly' ||
    subscriptionPeriod === 'p1m'
  ) {
    return 'monthly';
  }

  return fallback;
};

const getStoreProductKind = (product: PurchasesStoreProduct): PremiumPackageKind => {
  const productIdentifier = normalizeIdentifier(product.identifier);
  const subscriptionPeriod = normalizeIdentifier(product.subscriptionPeriod);

  if (
    productIdentifier === PREMIUM_YEARLY_PRODUCT_ID ||
    productIdentifier.includes('year') ||
    productIdentifier.includes('annual') ||
    subscriptionPeriod === 'p1y'
  ) {
    return 'annual';
  }

  if (
    productIdentifier === PREMIUM_MONTHLY_PRODUCT_ID ||
    productIdentifier.includes('month') ||
    subscriptionPeriod === 'p1m'
  ) {
    return 'monthly';
  }

  return 'other';
};

const getPackageHighlight = (
  kind: PremiumPackageKind,
  annualPackage: PurchasesPackage | null,
  monthlyPackage: PurchasesPackage | null,
) => {
  if (kind !== 'annual') {
    return null;
  }

  return annualPackage && monthlyPackage
    ? buildSavingsHighlight(annualPackage, monthlyPackage)
    : 'Best value';
};

const buildOptionText = (
  kind: PremiumPackageKind,
  product: PurchasesStoreProduct,
) => ({
  description:
    kind === 'annual'
      ? 'Get monthly check-ins, smart suggestions, and recovery backup for the whole year.'
      : kind === 'monthly'
        ? 'Keep the smart extras and recovery backup on a monthly plan.'
        : product.description || 'Premium access',
  perMonthLabel:
    kind === 'annual' || kind === 'monthly'
      ? product.pricePerMonthString
      : null,
  title:
    kind === 'annual'
      ? 'Yearly'
      : kind === 'monthly'
        ? 'Monthly'
        : product.title || 'Premium',
});

const buildPackageOptions = (
  offering: PurchasesOffering | null,
  storeProducts: PurchasesStoreProduct[],
) => {
  packageCache.clear();
  productCache.clear();

  const options: PremiumPackageOption[] = [];
  const seenPackageIds = new Set<string>();
  const seenProductIds = new Set<string>();

  const pushPackage = (
    revenueCatPackage: PurchasesPackage | null,
    fallbackKind: PremiumPackageKind,
    highlight: string | null = null,
  ) => {
    if (!revenueCatPackage) {
      return;
    }

    const id = revenueCatPackage.identifier || revenueCatPackage.product.identifier;
    const productId = revenueCatPackage.product.identifier;

    if (seenPackageIds.has(id) || seenProductIds.has(productId)) {
      return;
    }

    const kind = getPackageKind(revenueCatPackage, fallbackKind);
    const text = buildOptionText(kind, revenueCatPackage.product);

    seenPackageIds.add(id);
    seenProductIds.add(productId);
    packageCache.set(id, revenueCatPackage);

    options.push({
      id,
      description: text.description,
      highlight,
      kind,
      perMonthLabel: text.perMonthLabel,
      priceLabel: revenueCatPackage.product.priceString,
      title: text.title,
    });
  };

  const availablePackages = offering?.availablePackages ?? [];
  const annualPackage =
    offering?.annual ??
    availablePackages.find((revenueCatPackage) => getPackageKind(revenueCatPackage) === 'annual') ??
    null;
  const monthlyPackage =
    offering?.monthly ??
    availablePackages.find((revenueCatPackage) => getPackageKind(revenueCatPackage) === 'monthly') ??
    null;

  pushPackage(annualPackage, 'annual', getPackageHighlight('annual', annualPackage, monthlyPackage));
  pushPackage(monthlyPackage, 'monthly');

  availablePackages.forEach((revenueCatPackage) => {
    const kind = getPackageKind(revenueCatPackage);
    pushPackage(revenueCatPackage, kind, getPackageHighlight(kind, annualPackage, monthlyPackage));
  });

  storeProducts.forEach((product) => {
    if (seenProductIds.has(product.identifier)) {
      return;
    }

    const kind = getStoreProductKind(product);
    const text = buildOptionText(kind, product);

    seenProductIds.add(product.identifier);
    productCache.set(product.identifier, product);

    options.push({
      id: product.identifier,
      description: text.description,
      highlight: kind === 'annual' ? 'Best value' : null,
      kind,
      perMonthLabel: text.perMonthLabel,
      priceLabel: product.priceString,
      title: text.title,
    });
  });

  return options;
};

const getPremiumStatus = (customerInfo: CustomerInfo | null): PremiumStatus => {
  if (!canUseRevenueCat) {
    return 'free';
  }

  if (!customerInfo) {
    return configured ? 'free' : 'unknown';
  }

  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] ? 'premium' : 'free';
};

const buildSnapshot = (): PurchaseSnapshot => ({
  appUserId: cachedAppUserId,
  currentOfferingDescription: cachedOffering?.serverDescription ?? '',
  currentOfferingId: cachedOffering?.identifier ?? null,
  isAvailable: canUseRevenueCat,
  isConfigured: configured,
  lastError: cachedLastError ?? (canUseRevenueCat ? null : getUnavailableMessage()),
  managementUrl: cachedCustomerInfo?.managementURL ?? null,
  packages: buildPackageOptions(cachedOffering, cachedStoreProducts),
  premiumStatus: getPremiumStatus(cachedCustomerInfo),
  purchaseState: cachedLastError
    ? 'error'
    : configured
      ? 'ready'
      : canUseRevenueCat
        ? 'loading'
        : 'error',
});

const emitSnapshot = () => {
  const snapshot = buildSnapshot();
  snapshotListeners.forEach((listener) => listener(snapshot));
  return snapshot;
};

const attachCustomerInfoListener = () => {
  if (customerInfoListenerAttached || !canUseRevenueCat) {
    return;
  }

  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    cachedCustomerInfo = customerInfo;
    void Purchases.getAppUserID()
      .then((appUserId) => {
        cachedAppUserId = appUserId;
      })
      .catch(() => {
        cachedAppUserId = null;
      })
      .finally(() => {
        cachedLastError = null;
        emitSnapshot();
      });
  });

  customerInfoListenerAttached = true;
};

const syncRevenueCatUser = async (userId: string | null) => {
  const currentAppUserId = await Purchases.getAppUserID();

  if (userId) {
    if (currentAppUserId !== userId) {
      const result = await Purchases.logIn(userId);
      cachedCustomerInfo = result.customerInfo;
      cachedAppUserId = userId;
      return;
    }

    cachedAppUserId = currentAppUserId;
    return;
  }

  const isAnonymous = await Purchases.isAnonymous();

  if (!isAnonymous) {
    cachedCustomerInfo = await Purchases.logOut();
  }

  cachedAppUserId = await Purchases.getAppUserID();
};

const refreshRevenueCatSnapshot = async () => {
  cachedCustomerInfo = await Purchases.getCustomerInfo();
  cachedAppUserId = await Purchases.getAppUserID();
  const offerings = await Purchases.getOfferings();
  cachedOffering = offerings.current;
  try {
    cachedStoreProducts = await Purchases.getProducts(
      [PREMIUM_MONTHLY_PRODUCT_ID, PREMIUM_YEARLY_PRODUCT_ID],
      PRODUCT_CATEGORY.SUBSCRIPTION,
    );
  } catch {
    cachedStoreProducts = [];
  }
  cachedLastError = null;
  return emitSnapshot();
};

export const getPurchaseSnapshot = () => buildSnapshot();

export const subscribeToPurchaseState = (listener: (snapshot: PurchaseSnapshot) => void) => {
  snapshotListeners.add(listener);
  listener(buildSnapshot());

  return () => {
    snapshotListeners.delete(listener);
  };
};

export const initializePurchases = async (userId: string | null) => {
  if (!canUseRevenueCat) {
    cachedLastError = getUnavailableMessage();
    return emitSnapshot();
  }

  try {
    if (!configured) {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.INFO);
      Purchases.configure({
        apiKey: getRevenueCatApiKey(),
        appUserID: userId ?? undefined,
      });
      configured = true;
      attachCustomerInfoListener();
    } else {
      await syncRevenueCatUser(userId);
    }

    return await refreshRevenueCatSnapshot();
  } catch (error) {
    cachedLastError = normalizeRevenueCatError(error);
    return emitSnapshot();
  }
};

export const refreshPurchases = async () => {
  if (!canUseRevenueCat || !configured) {
    return emitSnapshot();
  }

  try {
    return await refreshRevenueCatSnapshot();
  } catch (error) {
    cachedLastError = normalizeRevenueCatError(error);
    return emitSnapshot();
  }
};

export const purchasePremiumPackage = async (packageId: string) => {
  if (!canUseRevenueCat) {
    throw new Error(getUnavailableMessage());
  }

  const revenueCatPackage = packageCache.get(packageId);
  const storeProduct = productCache.get(packageId);

  if (!revenueCatPackage && !storeProduct) {
    throw new Error('Premium is unavailable right now.');
  }

  const result = revenueCatPackage
    ? await Purchases.purchasePackage(revenueCatPackage)
    : await Purchases.purchaseStoreProduct(storeProduct!);
  cachedCustomerInfo = result.customerInfo;
  cachedAppUserId = await Purchases.getAppUserID();
  cachedLastError = null;

  return emitSnapshot();
};

export const restorePremiumPurchases = async () => {
  if (!canUseRevenueCat) {
    throw new Error(getUnavailableMessage());
  }

  cachedCustomerInfo = await Purchases.restorePurchases();
  cachedAppUserId = await Purchases.getAppUserID();
  cachedLastError = null;

  return emitSnapshot();
};

export const openSubscriptionManagement = async () => {
  const url = cachedCustomerInfo?.managementURL || appleManageSubscriptionsUrl;
  await Linking.openURL(url);
};
