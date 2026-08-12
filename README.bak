# Budget Buddy (Mobile App)

A simple Expo React Native app to track monthly budgets by category.

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
   
   ```

3. Open on iOS/Android simulator or the Expo Go app.

## Type checking

```bash
npm run typecheck
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

- [APP_STORE_METADATA.md](/Users/rahulkumar/StudioProjects/budget_app/APP_STORE_METADATA.md)
- [PRIVACY.md](/Users/rahulkumar/StudioProjects/budget_app/PRIVACY.md)
- [SUPPORT.md](/Users/rahulkumar/StudioProjects/budget_app/SUPPORT.md)
