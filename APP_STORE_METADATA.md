# Budget Buddy iOS Launch Metadata

## App identity

- App name: `Budget Buddy`
- Expo slug: `budget-buddy`
- Expo owner: `rahul0083.be`
- Bundle identifier: `com.rahulkumar.budgetbuddy`
- Android package: `com.rahulkumar.budgetbuddy`
- URL scheme: `budgetbuddy`
- SKU: `com.rahulkumar.budgetbuddy`
- Primary category: `Finance`
- Pricing model: `Free`

## Store listing draft

- Subtitle: `Local-first budgets with smarter monthly reviews`
- Promotional text: `Plan the month clearly, track flexible spend, and recover your budget when you need it.`
- Keywords: `budget,budgeting,expense tracker,monthly planner,savings,finance,spending,subscriptions`

## Description draft

Budget Buddy keeps budgeting simple: set a monthly amount, build categories that match real life, and track what is left without turning the app into a spreadsheet.

The core app stays free and local-first. You can create budgets, add categories and subcategories, log expenses, manage bank-account tags, import/export data, and review your month without creating an account.

Budget Buddy Premium unlocks:

- Monthly check-ins that separate fixed recurring costs from adjustable spend
- Smart expense suggestions for category, bank account, and repeat flag
- Smart tidy-up for imported budgets
- Starter-plan suggestions from your prior months
- Optional recovery backup after reinstall

## Subscription setup

- Subscription group: `Premium`
- Entitlement: `premium`
- Products:
  - `premium_monthly`
  - `premium_yearly`
- RevenueCat offering:
  - current/default offering should contain the monthly and yearly packages above

## RevenueCat and App Store Connect checklist

1. Register the Apple Developer App ID with bundle ID `com.rahulkumar.budgetbuddy`.
2. Enable Push Notifications only if the app adds push messaging later.
3. Create the app in App Store Connect with name `Budget Buddy`, bundle ID `com.rahulkumar.budgetbuddy`, and SKU `com.rahulkumar.budgetbuddy`.
4. Add the app as `Free`.
5. Create the `Premium` subscription group.
6. Create `premium_monthly` and `premium_yearly`.
7. Add the matching products to RevenueCat.
8. Create the `premium` entitlement in RevenueCat.
9. Attach the monthly and yearly products to the current offering.
10. Add the public iOS SDK key to local env and EAS env as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
11. Point App Store Connect support/privacy URLs to hosted versions of [SUPPORT.md](./SUPPORT.md) and [PRIVACY.md](./PRIVACY.md).
12. Upload final icon, screenshots, and promotional art before submission.

## Subscription testing

1. Copy [.env.example](./.env.example) to `.env` and set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` to the RevenueCat iOS public SDK key for bundle ID `com.rahulkumar.budgetbuddy`.
2. Restart Expo with `npx expo start --clear`.
3. Test purchases in an iOS development build or TestFlight build. Expo Go cannot complete native in-app purchases.
4. Confirm RevenueCat has a current offering with packages mapped to `premium_monthly` and `premium_yearly`.

## Build and submit commands

```bash
npm exec --yes --cache /tmp/npm-cache-eas-build -- eas-cli build --platform ios --profile production --clear-cache
```

```bash
npm exec --yes --cache /tmp/npm-cache-eas-submit -- eas-cli submit --platform ios --profile production --latest --wait --verbose
```

## Local release checks

```bash
npm run typecheck
npx expo-doctor
npx expo export --platform ios --output-dir .expo-export-ios-check
rm -rf .expo-export-ios-check
```
