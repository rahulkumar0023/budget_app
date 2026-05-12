# Budget Buddy (Mobile App)

A simple Expo React Native app to track monthly budgets by category.

## App identity

- App name: `Budget Buddy`
- Expo slug: `budget-buddy`
- Expo owner: `rahul0083.be`
- iOS bundle ID: `com.rahulkumar.budgetbuddy`
- Android package: `com.rahulkumar.budgetbuddy`
- URL scheme: `budgetbuddy`

## Features

- Set a monthly budget limit.
- View planned, spent, and remaining totals.
- Add custom budget categories.
- See remaining budget per category.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start Expo:

   ```bash
   npm run start
   ```

3. Open on iOS/Android simulator or the Expo Go app.

## Type checking

```bash
npm run typecheck
```

## Local release checks

```bash
npx expo-doctor
npx expo export --platform ios --output-dir .expo-export-ios-check
rm -rf .expo-export-ios-check
```

## Account and backup

- The app is local-first by default.
- Firebase backup is optional and should be enabled only when the user wants reinstall or cross-device recovery.
- Email/password login lives in Firebase Auth.
- Firebase backup is a Premium feature and only runs when the user is signed in and backup is turned on.

## Premium setup

Budget Buddy uses RevenueCat for iOS subscriptions.

- Entitlement: `premium`
- Products:
  - `premium_monthly`
  - `premium_yearly`
- Public iOS SDK key env var:
  - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

Local example:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_sdk_key npm run start
```

For EAS production builds, add the same env var in EAS secrets or environment settings before building.

## iOS release prep

```bash
npm run build:ios
```

```bash
npm run submit:ios
```

Before App Store submission, still make sure you have:

- App Store Connect app created as a free Finance app
- RevenueCat products and entitlement mapped correctly
- final app icon and screenshots
- hosted support/privacy URLs ready for the store listing
- App Store privacy details filled in inside App Store Connect

Helpful launch docs:

- [APP_STORE_METADATA.md](./APP_STORE_METADATA.md)
- [PRIVACY.md](./PRIVACY.md)
- [SUPPORT.md](./SUPPORT.md)
