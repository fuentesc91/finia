# Budget Feature — Development Specification

This document describes the architecture, design patterns, and development requirements for the budget feature. **All new development must conform to the structure established here.**

---

## Overview

The budget feature lets authenticated users define spending limits per category (or globally across all categories) for a chosen period (weekly, biweekly, or monthly). Budgets are stored in Firestore and compared in real-time against the user's recorded expenses.

---

## File Map

```
app/
├── types/
│   └── budget.ts                          # All TypeScript types
├── lib/
│   ├── periods.ts                         # Period calculation logic (pure)
│   ├── periods.test.ts
│   ├── firestore.budgets.client.ts        # Firestore CRUD + real-time subscription
│   └── firestore.budgets.client.test.ts
├── components/budget/
│   ├── BUDGET.md                          # ← this file
│   ├── BudgetList.tsx                     # Orchestrator — owns state + subscriptions
│   ├── BudgetList.test.tsx
│   ├── BudgetForm.tsx                     # Create / edit form
│   ├── BudgetForm.test.tsx
│   ├── BudgetProgressCard.tsx             # Single budget card with spend stats
│   ├── BudgetProgressCard.test.tsx
│   ├── BudgetRibbon.tsx                   # Compact status pills rendered on home page
│   └── BudgetRibbon.test.tsx
└── routes/
    ├── budgets.tsx                        # Protected route — mounts BudgetList
    └── budgets.test.tsx
```

---

## Data Model

Firestore path: `users/{uid}/budgets/{budgetId}`

| Field       | Type                                    | Notes                                      |
|-------------|----------------------------------------|--------------------------------------------|
| `period`    | `{ type: "weekly" \| "biweekly" \| "monthly" }` | Object, not a plain string        |
| `category`  | `string \| null`                        | Matches the `Category` enum; `null` = global |
| `amount`    | `number`                               | Currency-agnostic positive number           |
| `createdAt` | Firestore `Timestamp`                  | Set once on creation                        |
| `updatedAt` | Firestore `Timestamp`                  | Refreshed on every update                   |

**TypeScript types live exclusively in `app/types/budget.ts`.** Never inline budget type definitions elsewhere.

### Rules for `category`
- A value from the `CATEGORIES` list means the budget applies to one category.
- `null` means the budget is global — it tracks total spending across all categories within the period.
- The UI maps the `null` case to the string `"global"` only inside form state; convert back to `null` before writing to Firestore.

---

## Period Calculation System (`app/lib/periods.ts`)

### Strategy Pattern

Each period type is implemented as a `PeriodStrategy` registered in `PERIOD_REGISTRY`:

```ts
export interface PeriodStrategy {
  getWindow(referenceDate: Date): PeriodWindow;
  label: string;  // Spanish display label
}

export const PERIOD_REGISTRY: Record<BudgetPeriodType, PeriodStrategy> = {
  weekly:    { getWindow: getWeeklyWindow,    label: "Semanal" },
  biweekly:  { getWindow: getBiweeklyWindow,  label: "Quincenal" },
  monthly:   { getWindow: getMonthlyWindow,   label: "Mensual" },
};
```

**Adding a new period type:**
1. Add the string literal to `BudgetPeriodType` in `app/types/budget.ts`.
2. Implement a `getWindow` function that returns `{ start, end, label }` (ISO strings, inclusive).
3. Register it in `PERIOD_REGISTRY`.
4. Add test cases to `periods.test.ts` covering boundary days, month transitions, and leap years.
5. Add the option to `BudgetForm`'s period select.

### Key Pure Functions

| Function | Signature | Purpose |
|---|---|---|
| `getPeriodWindow` | `(period, date?) => PeriodWindow` | Returns start/end/label for the window containing `date` |
| `isDateInWindow` | `(dateStr, window) => boolean` | Checks if an ISO date falls inside a window |
| `computeSpending` | `(expenses, budget, date?) => number` | Sums matching expenses within the period window |

All three are pure functions with no side effects. Compute spending here — never inside components.

---

## Firestore Layer (`app/lib/firestore.budgets.client.ts`)

### Public API

| Function | Signature | Notes |
|---|---|---|
| `saveBudget` | `(uid, input) => Promise<string>` | Returns new document ID |
| `updateBudget` | `(uid, id, input) => Promise<void>` | Partial update, refreshes `updatedAt` |
| `deleteBudget` | `(uid, id) => Promise<void>` | Idempotent — succeeds if doc not found |
| `getBudgets` | `(uid) => Promise<Budget[]>` | One-time read, ordered by `createdAt asc` |
| `subscribeToBudgets` | `(uid, callback, onError?) => () => void` | Real-time listener; returns unsubscribe |

### Error Handling

All functions use `normalizeFirestoreError` to map Firestore error codes to user-facing Spanish messages. Any new Firestore function in this file must follow the same pattern. Never throw raw Firestore errors.

```ts
// Required codes → Spanish messages
"permission-denied"  → "No tienes permiso para realizar esta acción."
"unavailable"        → "Servicio no disponible. Verifica tu conexión."
"not-found"          → "No se encontró el documento."
```

### Document Deserialization

`mapDocToBudget` converts raw Firestore data to a typed `Budget`. It must:
- Validate `period.type` against known values; fall back to `"monthly"` if unknown.
- Validate `category` against `CATEGORIES`; fall back to `null` if unknown.
- Convert Firestore `Timestamp` → JavaScript `Date`.

Any new fields added to `Budget` must also be handled in `mapDocToBudget` with an explicit fallback.

---

## Component Architecture

### Responsibility Matrix

| Component | Owns State | Firestore Access | Purpose |
|---|---|---|---|
| `BudgetList` | Yes | Yes (via lib) | Orchestrator: subscriptions, CRUD dispatch, navigation |
| `BudgetForm` | Local only | Yes (save/update) | Controlled form for create and edit modes |
| `BudgetProgressCard` | No | No | Presentational: renders stats for one budget |
| `BudgetRibbon` | Minimal | Yes (subscribe) | Summary pills embedded on the home page |

**Rule:** `BudgetProgressCard` is purely presentational — it receives data via props, does not call Firestore, and does not subscribe to anything. Keep it that way.

### `BudgetList` — Orchestrator Pattern

`BudgetList` is the single source of truth for the budgets page. It:
- Subscribes to `subscribeToBudgets` and `subscribeToExpenses` in `useEffect` hooks (each returns an unsubscribe function that must be called on cleanup).
- Owns `editingBudget`, `showForm`, `referenceDate`, and `deletingId` state.
- Passes callbacks down to `BudgetForm` (`onSaved`, `onCancel`) and `BudgetProgressCard` (`onEdit`, `onDelete`).
- Manages period navigation: the reference date shifts by the number of days in the first budget's period type.

**Do not lift Firestore subscriptions into the route component** (`budgets.tsx`). The route's only responsibility is auth-gating and rendering `<BudgetList uid={user.uid} />`.

### `BudgetForm` — Dual-Mode Form

`BudgetForm` operates in two modes controlled by the `existing` prop:
- `existing` is undefined → create mode (`saveBudget`)
- `existing` is a `Budget` → edit mode (`updateBudget`)

All field defaults initialize from `existing` when provided. The form never receives callbacks for Firestore operations from outside — it calls `saveBudget`/`updateBudget` directly and then fires `onSaved()`.

### `BudgetRibbon` — Home Page Integration

`BudgetRibbon` is a secondary entry point rendered in `home.tsx`, below the expense form and above the expense list. It:
- Returns `null` when no budgets exist (renders nothing, no empty state).
- Subscribes to budgets in its own `useEffect`.
- Shows one pill per budget linking to `/budgets`.
- Is self-contained: does not share subscription state with `BudgetList`.

---

## Progress Bar Color Logic

The same thresholds must be used consistently across `BudgetProgressCard` and `BudgetRibbon`:

| Condition | Color |
|---|---|
| `spent > amount` | Red (`bg-red-500`) |
| `spent / amount >= 0.90` (ribbon) or `0.80` (card) | Amber (`bg-amber-400`) |
| Below threshold | Indigo (`bg-indigo-500`) |

If thresholds are changed, update both components and their tests together.

---

## State Management Rules

- **No external state library.** Use React hooks: `useState`, `useEffect`, `useRef`, `useCallback`.
- **Real-time over polling.** Always use `subscribeToBudgets`/`subscribeToExpenses` (Firestore `onSnapshot`) rather than one-time `getBudgets`/`getExpenses` + manual refresh.
- **Unsubscribe on cleanup.** Every `useEffect` that registers a listener must return the unsubscribe function:
  ```ts
  useEffect(() => {
    const unsub = subscribeToBudgets(uid, setBudgets, setError);
    return unsub;
  }, [uid]);
  ```
- **Never store derived data.** Spending totals, ratios, window labels, and remaining amounts are computed at render time from `budgets + expenses + referenceDate`. Do not cache them in state.

---

## Auth Integration

- All budget Firestore paths are scoped to the authenticated user: `users/{uid}/budgets`.
- Components that access Firestore receive `uid: string` as a prop — they do not call `useAuth()` themselves.
- Auth-gating is the route's responsibility (`budgets.tsx`). Components assume `uid` is always a valid, authenticated user ID.

---

## Currency Formatting

All displayed amounts must use `formatAmount()` from `~/config/currency`. Never format currency with hardcoded symbols or `toFixed()` in component JSX.

```ts
import { formatAmount } from "~/config/currency";
// ...
<span>{formatAmount(spent)}</span>
```

---

## Internationalization

- All UI labels, button text, error messages, and period labels are in Spanish (es-MX).
- Date formatting uses `toLocaleDateString("es-MX", { ... })`.
- Error messages from Firestore are Spanish strings returned by `normalizeFirestoreError`.
- Do not use English strings in the UI. If adding new labels, use Spanish.

---

## Testing Requirements

**Rule: every new or modified source file must have a corresponding `.test.ts` / `.test.tsx` file updated in the same commit.**

### Coverage Targets per File

| File | Required test coverage |
|---|---|
| `periods.ts` | All three period types, boundary days (1st, 15th, last), month transitions, leap years |
| `firestore.budgets.client.ts` | All CRUD functions, all error code mappings, `mapDocToBudget` fallbacks |
| `BudgetForm.tsx` | Create mode submission, edit mode pre-population, validation (empty amount), cancel |
| `BudgetProgressCard.tsx` | Over budget, at-threshold, under threshold; global vs. category filtering; stats display |
| `BudgetList.tsx` | Subscription lifecycle, period navigation, inline form toggle, delete feedback |
| `BudgetRibbon.tsx` | Returns null with no budgets; pill count and colors; link targets |
| `budgets.tsx` | Auth redirect when unauthenticated; renders `BudgetList` when authenticated |

### Mocking Rules (extend from global rules in `CLAUDE.md`)

- Mock `~/lib/firebase.client` with `{ auth: {}, db: {} }`.
- Mock `~/lib/firestore.budgets.client` for components that call it.
- Mock `~/lib/firestore.client` for components that use expense subscriptions.
- Mock `~/lib/periods` only when testing components — test `periods.ts` itself with real logic.
- Do not mock `react-router` `Link` — render it as-is unless navigation is under test.

---

## Adding a New Budget Feature

Checklist for any addition to the budget system:

- [ ] Types added to `app/types/budget.ts` (never inline types in components).
- [ ] Pure business logic goes in `app/lib/periods.ts` or a new dedicated pure lib file.
- [ ] Firestore operations go in `app/lib/firestore.budgets.client.ts` following `normalizeFirestoreError`.
- [ ] Components follow the responsibility matrix above (presentational vs. orchestrator).
- [ ] No new Firestore subscriptions in `BudgetProgressCard`.
- [ ] `BudgetList` remains the single orchestrator for the budgets page.
- [ ] Currency amounts formatted via `formatAmount()`.
- [ ] All labels and messages in Spanish (es-MX).
- [ ] Dark mode variants (`dark:`) added for every new light-mode color class.
- [ ] Test file updated or created alongside the source file.
- [ ] New period types registered in `PERIOD_REGISTRY` and covered in `periods.test.ts`.
