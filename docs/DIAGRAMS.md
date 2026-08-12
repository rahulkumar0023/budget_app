# Budget Buddy Diagrams

Visual guides to understanding the Budget Buddy app architecture, data model, and user workflows. All diagrams are self-contained HTML + SVG files with no external dependencies — open them directly in your browser.

## App Architecture

**[View Architecture Diagram →](./diagrams/budget-app-architecture.html)**

Shows the layered structure of Budget Buddy:
- **UI Layer**: React Native / Expo screens (Dashboard, Categories, Transactions, Settings)
- **Data Layer**: Core business entities (Budgets, Transactions, Months, Goals, Accounts)
- **Storage Layer**: AsyncStorage (local), Firebase (optional backup), RevenueCat (subscriptions)

## Budget Workflow

**[View Workflow Diagram →](./diagrams/budget-workflow.html)**

Illustrates the monthly budget cycle:
1. Set monthly budget limit
2. Create budget categories (Needs, Wants, Savings)
3. Track daily expenses
4. Analyze spending patterns
5. Adjust if over budget
6. Roll over to next month

## Data Model

The app tracks these key entities:

- **Category** — Budget line items with planned amount, bucket type (needs/wants/savings), and theme
- **Transaction** — Individual expenses linked to categories with amount, date, and notes
- **MonthRecord** — Aggregates categories and transactions for a specific month
- **Goal** — Savings targets for future plans
- **BankAccount** — Account definitions (spending, recurring, savings, investing)
- **AppPreferences** — User settings (theme, currency, language, backup)

See [`budgetModel.ts`](../budgetModel.ts) for the complete type definitions.

## Creating Custom Diagrams

These diagrams use the [diagram-design](https://github.com/cathrynlavery/diagram-design) system—27 editorial diagram types with minimal design and no external dependencies.

To create additional diagrams for your documentation:
1. Install diagram-design as a Claude Code skill: `diagram-design`
2. Use the `/diagram-design` command to generate new diagrams
3. The skill automatically applies your app's color scheme

**Available diagram types**: Architecture, Flowchart, Sequence, ER diagram, Timeline, Swimlane, Quadrant, Tree, Org chart, Pyramid, Gantt, Bar/Line charts, and more.
