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
- Category icons retain their individual colors, while progress bars use each app theme's high-contrast semantic colors: green on track, amber to watch, and red when over. Overview bars are 6 px high for legibility.
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

The footer is a floating rounded dock with four equally sized destinations. It uses lightweight custom-drawn icons with stronger active states:

- Overview — wallet
- Transactions — receipt
- Plan — pie chart
- Settings — sliders

The active destination receives a soft theme-colored pill and a stronger icon stroke. The dock has a subtle border and shadow so it remains distinct without looking like a heavy toolbar. The icons use React Native views rather than an icon-font dependency, ensuring the existing native development build can render them without `ExpoFontLoader` or a native rebuild.

A small floating **+** sits just above the dock as the app-wide creation point. It opens a compact menu for the three common additions:

- **Expense** — opens the amount-first expense sheet.
- **Income** — records money received without changing the monthly spending budget.
- **Category** — opens the Plan category composer directly.

This keeps creation available from every main screen without adding a fifth navigation destination.

## Screen changes

### Overview

The Overview is a compact monthly status screen called **Budget Pulse**. It borrows the useful category visibility of Plan without becoming another editor.

It contains:

- the money left for the month as its primary number;
- spending against the full monthly amount;
- a restrained monthly progress bar;
- the total planned across categories;
- one compact **Add expense** action; and
- up to six compact category rows with spent, remaining, and progress.

Changes made:

- Renamed “Budget” to “Overview.”
- Replaced the large white current-budget dashboard with a forest-green Budget Pulse panel.
- Replaced the estimated safe-to-spend-today figure with the concrete amount left this month.
- Replaced internal “lane” and “fixed” language with “category” and “repeats.”
- Removed status pills, repeated month labels, forecasts, attention-only filtering, and recent transactions from Home.
- Added a direct **View plan** path for full monthly editing.
- Shows the first six categories in their Plan order so most budgets fit without page scrolling.
- Category rows use the sentence-like summary `$x of $y spent`, followed by `$z remaining` at the end of the row and a progress bar underneath. Over-budget rows replace `remaining` with `over`.
- Links any additional category count directly to Plan.
- Tapping a category opens a compact detail sheet with one monthly-progress summary, spent and remaining amounts, a single progress bar, an Add expense action, a small header-level Edit action, and up to five recent expenses. The activity section is hidden entirely when no expenses exist.
- The category detail sheet uses nearly the full available height so it can work as a focused category workspace.
- Subcategories can be added with a full-width inline form. They are displayed as structured rows rather than chips, including an initial, amount spent, and a dedicated quick-add control. Tapping a row opens expense entry with that subcategory selected.
- The category workspace keeps its actions to one compact row: **+ Expense** and **+ Subcategory**. Empty subcategory messaging and repeated instructional labels are hidden; the subcategory section appears only when it contains rows or its add form is open.
- Adding an expense from a category keeps that category fixed and immediately exposes amount, description, date, and optional subcategory fields. Starting from a subcategory row preselects both the category and subcategory. The Save expense action follows these fields so the user can review the complete entry before saving.
- Added a focused first-budget state that leads directly to Plan setup.

### Transactions

The former “Activity” screen is now **Transactions**.

It contains:

- a direct **Add expense** action;
- recent transactions when present; and
- search/filter tools only when there is activity to search.

Expense entry is amount-first:

- the numeric field receives focus immediately;
- a bold forest panel matches the Plan screen’s financial hierarchy;
- four common amount shortcuts reduce typing;
- recently used categories appear first and the latest valid category is preselected;
- the note follows category selection and is explicitly optional;
- date, account, recurrence, and other secondary fields remain behind **Add details**; and
- the primary action uses the direct label **Save expense**.

The expense sheet was refined into one calm sequence: amount, category when needed, description, date, optional subcategory, and Save. Date is always visible rather than hidden behind details. Account and monthly repeat controls live under one **More options** action. Recent-template shortcuts and Smart Match controls were removed from this primary flow so they do not compete with expense entry. When opened from a category, the sheet title names that category and does not repeat a category selector.

The final density pass reduced the expense amount typography, card radii, internal padding, shortcut chips, date row, subcategory controls, gaps, and Save button height. The interface remains comfortably tappable but no longer feels oversized on a phone.

A subsequent flattening pass removed nested surfaces from expense entry. The amount remains the single branded card; description, date, and advanced options now use open rows and subtle dividers. Quick amounts are plain text actions until selected. This prevents the sheet from looking like a stack of unrelated boxes.

Changes made:

- Removed the empty secondary transaction card.
- Hidden filters and refinement controls when no transactions exist.
- Reduced the empty state to a short “Ready to log” message.
- Preserved editing, deleting, categorization, dates, accounts, and recurring expense support.
- Added income entries to the same chronological history, with positive amounts and an Income label.
- Income totals are shown separately from spending totals. Income never increases the monthly limit or category availability automatically.

### Plan

The Plan screen was flattened so routine budgeting no longer requires opening nested lists.

The default state now shows:

- an editable monthly amount;
- allocation progress, planned total, and the amount still available; and
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
- Removed the setup stepper and separate review screen from the rendered experience.
- Removed repeated review actions and setup summaries.
- Changed allocation messages to direct text without emoji prefixes.
- The category composer is closed when a populated plan opens.
- **Add category** and **Edit** open the composer only when needed.
- **Reorder** switches the category list into a focused arrangement mode with move-up and move-down controls. The stored order is reused by Plan and Overview.
- Quick-start presets appear only when the month has no categories.
- Advanced bucket, subcategory, and recurring controls live behind **More options**.
- AI starter and Premium controls do not appear in the primary Plan screen.
- New Groceries presets do not default to recurring; existing saved categories are not modified.
- Added a confirmed **Delete [month] budget** button inside Plan’s Monthly Budget panel. Its in-app confirmation works consistently across iOS, Android, and web. It clears only the selected month’s amount, categories, and transactions; other months, accounts, goals, and preferences remain intact.

The monthly amount, category list, and category editor now live on one page. There is no separate setup or review workflow.

### No-budget experience

Months without a usable budget now enter a focused setup mode instead of showing empty charts and zero-value dashboards.

- **Overview** presents an illustrated invitation to create or continue the selected month, a three-part preview of the process, and **Copy previous budget** only when history exists.
- **Transactions** replaces inactive filters and empty totals with one explanation and a direct route to budget creation.
- **Plan** becomes a one-page **Build your month** experience: monthly amount, live still-available balance, user-entered categories, inline edits, and one final **Create my budget** action.
- Suggested category cards were removed from first-time setup so the plan reflects the user’s own categories.
- Keyboard submission follows the form naturally: Enter moves from monthly amount to category name, then to planned amount, and finally adds the category.
- Setup progress is saved as the user works, so an interrupted budget can be continued.
- Category creation prevents duplicate names and permits unplanned money to remain available.
- Planning above the monthly amount produces a warning without blocking completion.
- Advanced category controls stay out of first-time setup and remain available later from the normal Plan editor.
- The Plan tab shows a small attention dot until the selected month has at least one category.
- Completing setup returns to Overview; deleting a budget returns to the clean builder.

### Settings

The former “More” dashboard became a direct **Settings** screen.

The Settings overview is a native-style preference list with three groups:

1. **General** — Appearance, Currency & language, and Accounts.
2. **Data** — Backup and Import or export.
3. **Account** — Sign in/Account and Budget Buddy Premium.

The app version appears as quiet footer text rather than another card.

Changes made:

- Removed upgrade advertising from the Settings landing view.
- Removed Plan and Insights shortcut cards.
- Removed the secondary settings-section tab strip.
- Replaced dashboard cards with compact rows, hairline dividers, current values, and chevrons.
- Removed descriptive paragraphs and backup warnings from the landing screen.
- Kept Premium in one predictable Account row instead of distributing promotions around the app.
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
- `npm run typecheck`; and
- `git diff --check`.

Current model-test result:

```text
5 tests passed
0 tests failed
```

The repository-wide TypeScript check completes successfully.

## Guardrails for future UI work

Before adding anything to a primary screen, verify that it supports one of these tasks:

- understand the current month;
- record a transaction;
- adjust the monthly plan; or
- manage an essential preference.

If a control is occasional, advanced, promotional, or explanatory, place it behind an explicit action or in a detail screen. Avoid adding a fifth primary tab unless user research demonstrates a frequent task that cannot fit the four current destinations.
