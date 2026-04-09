import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

export const PREMIUM_ENTITLEMENT_ID = 'premium';

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

const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';
const appleManageSubscriptionsUrl = 'https://apps.apple.com/account/subscriptions';

let configured = false;
let cachedAppUserId: string | null = null;
let cachedCustomerInfo: CustomerInfo | null = null;
let cachedOffering: PurchasesOffering | null = null;
let cachedLastError: string | null = null;
let customerInfoListenerAttached = false;

const packageCache = new Map<string, PurchasesPackage>();
const snapshotListeners = new Set<(snapshot: PurchaseSnapshot) => void>();

const getUnavailableMessage = () => {
  if (Platform.OS !== 'ios') {
    return 'Premium subscriptions are configured for iOS only right now.';
  }

  return 'Premium purchases are not connected in this build yet.';
};

const canUseRevenueCat = Platform.OS === 'ios' && Boolean(iosApiKey);

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

  return 'Premium purchases are unavailable right now.';
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

const buildPackageOptions = (offering: PurchasesOffering | null) => {
  packageCache.clear();

  if (!offering) {
    return [] as PremiumPackageOption[];
  }

  const options: PremiumPackageOption[] = [];
  const seenPackageIds = new Set<string>();

  const pushPackage = (
    revenueCatPackage: PurchasesPackage | null,
    kind: PremiumPackageKind,
    highlight: string | null = null,
  ) => {
    if (!revenueCatPackage) {
      return;
    }

    const id = revenueCatPackage.identifier || revenueCatPackage.product.identifier;

    if (seenPackageIds.has(id)) {
      return;
    }

    seenPackageIds.add(id);
    packageCache.set(id, revenueCatPackage);

    options.push({
      id,
      description:
        kind === 'annual'
          ? 'Unlock AI reviews, smart suggestions, and recoverable backup for the whole year.'
          : kind === 'monthly'
            ? 'Keep premium AI and backup flexible on a monthly plan.'
            : revenueCatPackage.product.description || 'Premium access',
      highlight,
      kind,
      perMonthLabel:
        kind === 'annual'
          ? revenueCatPackage.product.pricePerMonthString
          : kind === 'monthly'
            ? revenueCatPackage.product.pricePerMonthString
            : null,
      priceLabel: revenueCatPackage.product.priceString,
      title:
        kind === 'annual'
          ? 'Yearly'
          : kind === 'monthly'
            ? 'Monthly'
            : revenueCatPackage.product.title || 'Premium',
    });
  };

  pushPackage(
    offering.annual,
    'annual',
    offering.annual && offering.monthly
      ? buildSavingsHighlight(offering.annual, offering.monthly)
      : 'Best value',
  );
  pushPackage(offering.monthly, 'monthly');

  offering.availablePackages.forEach((revenueCatPackage) => {
    pushPackage(revenueCatPackage, 'other');
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
  packages: buildPackageOptions(cachedOffering),
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
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
      Purchases.configure({
        apiKey: iosApiKey,
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

  if (!revenueCatPackage) {
    throw new Error('Premium offering is not ready yet.');
  }

  const result = await Purchases.purchasePackage(revenueCatPackage);
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
