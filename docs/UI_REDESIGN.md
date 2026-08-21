# Budget Buddy UI and Brand Redesign

This document records the icon, visual-system, navigation, and interface work completed for Budget Buddy in August 2026. It is the reference for the current product direction and should be consulted before adding new screens or controls.

## Product direction

The redesign changed Budget Buddy from a feature-heavy finance dashboard into a focused monthly budgeting app.

The primary experience is designed to answer three questions quickly:

1. How much money is available?
2. Where has the money gone?
3. What needs attention?

The working principles are:

- Show the monthly budget before secondary analysis.
- Keep the most common actions visible and hide editing tools until requested.
- Prefer plain financial language over internal terminology.
- Use one clear visual hierarchy instead of many competing cards and badges.
- Preserve advanced capabilities without placing them in the primary navigation.
- Keep the app local-first and useful without Premium features.

## Brand and app icon

A new icon family was created to replace the previous app icon.

### Current assets

- `assets/icon-v3.png` — primary 1024 × 1024 app icon.
- `assets/adaptive-foreground-v3.png` — transparent 1024 × 1024 Android adaptive-icon foreground.
- `assets/notification-icon.png` — 96 × 96 notification icon.
- `assets/splash.png` — splash-screen artwork used by Expo.

The icon includes the small `BB` initials requested for Budget Buddy. Its colors follow the main Budget Buddy theme: warm cream, forest green, and amber.

`app.json` now points to the v3 icon files:

```json
{
  "icon": "./assets/icon-v3.png",
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-foreground-v3.png",
      "backgroundColor": "#F6F1EA"
    }
  }
}
```

The splash background is also `#F6F1EA`, and the notification accent is forest green (`#23443B`). The generated iOS app-icon asset was updated to use the new artwork.

## Visual system

### Default identity

The default `indigo` theme identifier is retained for stored-data compatibility, but its user-facing identity is now **Budget Buddy**.

Core colors:

| Role | Color |
| --- | --- |
| App background | `#F6F1EA` |
| Primary forest | `#23443B` |
| Primary text | `#183D34` |
| Main surface | `#FFFFFF` |
| Soft surface | `#FBF8F3` |
| Positive progress | `#2F7D62` |
| Warning | `#E6A53A` |
| Alert | `#D96C5F` |

Large headings and important monetary values use a serif face (`Georgia`) to give the product a more distinctive editorial character. Supporting labels remain compact and practical.

### Background

The animated decorative blobs were removed. `AnimatedBackground` now renders:

- the active theme background color; and
- one restrained, translucent color wash near the top edge.

This reduces motion and visual noise while preserving depth.

### Surfaces and spacing

- Cards use softer borders and shadows.
- Corner radii and spacing are more consistent.
- The dashboard no longer forces a large minimum-height stage.
- Category rows are more compact: smaller icons, controls, amounts, and progress tracks.
- Decorative status elements are used only when they communicate actionable information.

## Theme selection

The picker was reduced to the four strongest themes:

1. **Budget Buddy** — warm cream, forest green, and amber.
2. **Garden Fresh** — off-white and vibrant teal.
3. **Warm Clay** — cream and terracotta.
4. **Forest Night** — deep green with warm gold.

Their stored identifiers remain:

```ts
['indigo', 'garden', 'warmclay', 'emerald']
```

Unsupported or previously stored theme identifiers normalize to `indigo`, ensuring older saved data opens with the new Budget Buddy theme rather than breaking preferences.

## Information architecture

The bottom navigation now contains four essential destinations:

| Tab | Purpose |
| --- | --- |
| Overview | Current-month position and budget lanes |
| Transactions | Expense entry and recent spending |
| Plan | Monthly amount, categories, and goals |
| Settings | Preferences, accounts, backup, and data tools |

The former three-tab structure and “More” hub were removed from the primary experience. The former Insights/Bigger Picture route is no longer a primary tab. Its underlying functionality has not been deleted, so it can be revisited later without rebuilding the calculations.

Tab icons were simplified to compact symbols: `⌂`, `↕`, `▤`, and `⚙`.

## Screen changes

### Overview

The Overview is now centered on the current month.

It contains:

- month and budget state;
- the amount available to spend;
- spent-versus-planned progress;
- one prominent **Add expense** action; and
- all budget categories as compact budget lanes.

Changes made:

- Renamed “Budget” to “Overview.”
- Changed “Left this month” to “Available to spend.”
- Removed priority-versus-healthy category hiding.
- Removed “show healthy categories” and similar reveal controls.
- Always shows the complete category list.
- Suppresses the primary insight when there is no spending and no over-budget category.
- Simplified empty-month copy.
- Reduced category-row dimensions and visual weight.

### Transactions

The former “Activity” screen is now **Transactions**.

It contains:

- a direct **Add expense** action;
- recent transactions when present; and
- search/filter tools only when there is activity to search.

Changes made:

- Removed the empty secondary transaction card.
- Hidden filters and refinement controls when no transactions exist.
- Reduced the empty state to a short “Ready to log” message.
- Preserved editing, deleting, categorization, dates, accounts, and recurring expense support.

### Plan

The Plan screen was flattened so routine budgeting no longer requires opening nested lists.

The default state now shows:

- the current monthly amount;
- one optional review action;
- allocation progress and the unassigned amount; and
- every category in the monthly plan.

Category cards now show only essential information:

- name and icon;
- bucket and recurring state as one compact line;
- spent, planned, and remaining amounts;
- progress; and
- **Edit** and **Delete** actions.

Changes made:

- Removed “Show current categories” and “Hide current categories.”
- Removed the collapsed category summary.
- Removed “Show all” and “Show fewer”; all categories are visible.
- Removed separate subcategory and duplicate actions from each card.
- Subcategories remain editable through the main category editor.
- Reduced multiple status badges to a single metadata line.
- Removed repeated review actions.
- Changed allocation messages to direct text without emoji prefixes.
- The category composer is closed when a populated plan opens.
- **Add category** and **Edit** open the composer only when needed.
- Quick-start presets appear only when the month has no categories.
- AI starter controls do not appear unless a planner result, error, or request is already active.
- New Groceries presets do not default to recurring; existing saved categories are not modified.

This preserves power for setup while keeping the everyday Plan screen short.

### Settings

The former “More” dashboard became a direct **Settings** screen.

The Settings overview contains five rows:

1. Theme
2. Currency and language
3. Accounts
4. Backup and recovery
5. Import and export

Changes made:

- Removed upgrade advertising from the Settings landing view.
- Removed Plan and Insights shortcut cards.
- Removed the secondary settings-section tab strip.
- Replaced it with one preferences list and direct detail navigation.
- Added a simple back control inside detailed settings sections.
- Retained authentication, RevenueCat, cloud recovery, and data import/export logic.

## Removed clutter versus retained capability

The redesign intentionally distinguishes between removing a feature and removing it from the primary path.

Removed from primary UI:

- repeated summaries;
- decorative dashboard cards;
- upgrade prompts on routine screens;
- initial AI suggestion triggers;
- hidden-category reveal controls;
- duplicate category-card actions;
- redundant review links;
- filters with nothing to filter; and
- lengthy instructional copy.

Retained in the application:

- monthly limit and category budgeting;
- needs/wants/savings buckets;
- recurring budgets and expenses;
- subcategories;
- savings goals;
- transaction search and filtering;
- accounts;
- currency and locale preferences;
- local persistence;
- import/export and reports;
- authentication and optional cloud recovery;
- RevenueCat Premium state; and
- existing AI review/planner implementation.

## Files changed

Primary redesign files:

- `App.tsx` — navigation, screen hierarchy, copy, conditional disclosure, category composer, Settings structure, and component styling.
- `budgetModel.ts` — four-theme catalog, Budget Buddy palette, theme labels, normalization, and starter-category behavior.
- `components/BudgetCategoryRow.tsx` — compact dashboard category layout.
- `src/components/layout/AnimatedBackground.tsx` — static restrained background treatment.
- `app.json` — app icon, adaptive icon, splash background, and notification color.
- `assets/icon-v3.png` — primary icon.
- `assets/adaptive-foreground-v3.png` — Android foreground artwork.
- `assets/notification-icon.svg` and `assets/notification-icon.png` — notification identity.
- `ios/BudgetBuddy/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` — generated iOS icon.

Native Expo/iOS project files and package lockfiles also changed during the associated Expo/iOS upgrade work. That work is documented separately in `docs/EXPO_IOS_UPGRADE.md`.

## Validation performed

The redesign was checked with:

- live Expo web rendering;
- direct navigation through Overview, Transactions, Plan, and Settings;
- opening the category composer from the compact Plan state;
- verification of empty Transactions and populated Plan states;
- Expo web bundle completion;
- `npm test`; and
- `git diff --check`.

Current model-test result:

```text
5 tests passed
0 tests failed
```

## Known issue

The full TypeScript check currently reports style-typing errors in the untracked component-system files under:

- `src/components/features/BudgetDashboard.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/StatCard.tsx`
- `src/components/ui/TransactionItem.tsx`

The errors concern React Native `fontWeight` and composed style typing. No reported TypeScript error points to the redesigned `App.tsx` implementation. These component-system errors should be resolved before treating the repository-wide type check as a release gate.

## Guardrails for future UI work

Before adding anything to a primary screen, verify that it supports one of these tasks:

- understand the current month;
- record a transaction;
- adjust the monthly plan; or
- manage an essential preference.

If a control is occasional, advanced, promotional, or explanatory, place it behind an explicit action or in a detail screen. Avoid adding a fifth primary tab unless user research demonstrates a frequent task that cannot fit the four current destinations.

