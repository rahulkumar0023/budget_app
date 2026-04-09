# Budget Buddy iOS Launch Metadata

## App identity

- App name: `Budget Buddy`
- Bundle identifier: `com.rahulkumar.budgetbuddy`
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

- AI monthly reviews that separate fixed recurring costs from adjustable spend
- AI expense suggestions for category, bank account, and repeat flag
- AI cleanup review for imported budgets
- AI starter-plan suggestions from your prior months
- optional Firebase backup and reinstall recovery

## Subscription setup

- Subscription group: `Premium`
- Entitlement: `premium`
- Products:
  - `premium_monthly`
  - `premium_yearly`
- RevenueCat offering:
  - current/default offering should contain the monthly and yearly packages above

## RevenueCat and App Store Connect checklist

1. Create the app in App Store Connect with bundle ID `com.rahulkumar.budgetbuddy`.
2. Add the app as `Free`.
3. Create the `Premium` subscription group.
4. Create `premium_monthly` and `premium_yearly`.
5. Add the matching products to RevenueCat.
6. Create the `premium` entitlement in RevenueCat.
7. Attach the monthly and yearly products to the current offering.
8. Add the public iOS SDK key to local env and EAS env as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
9. Point App Store Connect support/privacy URLs to hosted versions of [SUPPORT.md](/Users/rahulkumar/StudioProjects/budget_app/SUPPORT.md) and [PRIVACY.md](/Users/rahulkumar/StudioProjects/budget_app/PRIVACY.md).
10. Upload final icon, screenshots, and promotional art before submission.
