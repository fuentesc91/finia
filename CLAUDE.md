# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173 (HMR enabled)
npm run build      # Production build → build/client + build/server
npm run start      # Serve production build
npm run typecheck  # Run react-router typegen + tsc
```

## Architecture

**Stack:** React Router v7 (Remix successor) + Vite + TypeScript + Tailwind CSS v4 + Firebase

**SSR is enabled** (`react-router.config.ts` → `ssr: true`). Routes run on the server by default. Firebase client SDK must only be imported in client-side code — the file is named `firebase.client.ts` to make this explicit. Never import it in loader/action server functions.

**Auth flow:** Firebase Auth (client-side) wrapped in `app/context/auth.tsx` via `AuthProvider`. The `useAuth()` hook exposes `{ user, loading }`. Protected routes redirect to `/login` via `useEffect` when `!loading && !user`. The `AuthProvider` lives in `root.tsx` and wraps the entire app.

**Route registration:** Explicit in `app/routes.ts` — new routes must be added there manually.

**Styling:** Tailwind CSS v4 (`@import "tailwindcss"` in `app/app.css`). Dark mode is automatic via `prefers-color-scheme` — always add `dark:` variants when adding light-mode color classes. No toggle; no `class` strategy.

**Firebase config:** Loaded from `VITE_*` env vars in `.env`. The `.env` file is gitignored.

## Testing

Write unit tests for the most significant functionality and all error handling paths. Focus on:

- **AI categorization logic** — correct category assignment from descriptions, fallback when the API is unavailable or returns an unexpected response
- **Expense filtering** — date range filters, category filters, and their combination produce correct results
- **Auth error handling** — all Firebase Auth error codes map to user-facing Spanish messages; unknown codes fall back gracefully
- **Firestore operations** — reads/writes fail gracefully (network errors, permission denied, quota exceeded) without crashing the UI

Skip tests for trivial rendering or wiring. Prefer testing pure functions and logic over component snapshots.

**Rule: always create or update `.test.ts` / `.test.tsx` files alongside the source file before marking any feature complete.** Tests live next to their source file, not in a separate `__tests__` directory.

**Test stack:** Vitest + `@testing-library/react` + `@testing-library/user-event` + jsdom. Config is in `vitest.config.ts` (separate from `vite.config.ts` — the `reactRouter()` plugin is incompatible with jsdom). Run tests with:

```bash
npm run test:run   # single pass (CI)
npm test           # watch mode
```

**Mocking rules:**
- Always mock `~/lib/firebase.client` (`{ auth: {}, db: {} }`) to prevent real Firebase initialization.
- Mock `~/lib/firestore.client` for any component that calls Firestore.
- Mock `react-router`'s `useNavigate`, `useFetcher`, and `Link` to keep tests self-contained.
- For `useFetcher`, use a mutable object (`fetcherState`) and call `rerender()` inside `act()` to simulate server action responses.

## Error handling

Always handle failures for anything that depends on external systems:

- **Claude API calls** (categorization): catch network errors, timeouts, and malformed responses — fall back to category "Otros" and surface a non-blocking warning to the user
- **Firestore reads/writes**: catch and surface errors; never silently swallow them
- **Firebase Auth**: all operations (`signIn`, `signUp`, `signInWithPopup`) must have try/catch with user-facing messages in Spanish
- **Environment variables**: if a required `VITE_*` var is missing at startup, fail fast with a clear error rather than a cryptic runtime crash

## Project goal

See `FINIA.md` for the full product spec. The core feature is expense registration: user provides a description + amount, Claude AI auto-assigns a category and date. Expenses are stored in Firestore per user and displayed grouped by month with combinable date/category filters.
