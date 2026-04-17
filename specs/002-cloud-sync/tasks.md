---

description: "Task list for the Cloud Sync feature (002-cloud-sync)"
---

# Tasks: Cloud Sync

**Input**: Design documents from `/specs/002-cloud-sync/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Vitest unit tests (sync engine, sign-out wipe, no-network-when-signed-out) and one Playwright E2E (cloud-sync.spec.ts) are included — they implement the security and SC-004/SC-005 verification gates called out in the plan.

**Organization**: Tasks are grouped by user story from [spec.md](./spec.md) so each can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story the task serves (US1–US5 from [spec.md](./spec.md))
- All paths are relative to the repo root

## Path Conventions

Same single-project web app as v1. New folders added: `src/auth/`, `src/sync/`, `supabase/migrations/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pull in the Supabase SDK, wire env vars, and commit the schema + secrets-hygiene scaffolding so every user story below can start.

- [X] T001 Add `@supabase/supabase-js` (^2.45) to `dependencies` in [package.json](../../package.json) and install; remove `devDependencies.eslint-plugin-react-hooks` warnings if they surface on install
- [X] T002 [P] Create `.env.example` at repo root matching the template in [contracts/env-contract.md](./contracts/env-contract.md) (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, plus the explicit "no service_role" warning)
- [X] T003 [P] Add `.env.local` to [.gitignore](../../.gitignore) if not already present (confirm `.env*` pattern covers it)
- [X] T004 [P] Commit the SQL migration at `supabase/migrations/0001_profiles_rls.sql` — copy of [contracts/supabase-schema.sql](./contracts/supabase-schema.sql) verbatim, for version-controlled schema history
- [X] T005 [P] Update [README.md](../../README.md) with a "Cloud sync setup" section pointing at [specs/002-cloud-sync/quickstart.md](./quickstart.md) and repeating the `service_role`-is-forbidden rule
- [X] T006 Update [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) to: (a) pass `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as `env:` on the `build` job (sourced from GitHub Actions Variables), and (b) add a step that runs `grep -r -n --include='*.js' --include='*.css' --include='*.html' --include='*.map' service_role dist/` and fails the job on any match (security gate from the plan)
- [X] T007 [P] Create `src/lib/debounce.ts` — a tiny, typed debounce function `debounce<F>(fn: F, ms: number): F & { cancel(): void }`, no external deps
- [X] T008 [P] Manual one-time dashboard setup (NOT a code task — document in [quickstart.md](./quickstart.md) only): user applies `supabase/migrations/0001_profiles_rls.sql` via Supabase SQL editor, enables the **Email** provider in Auth → Providers with **Magic Link** on, and adds localhost + GitHub Pages URLs (plus their `#/auth/callback` variants) to Auth → URL Configuration

**Checkpoint**: `npm run build` still succeeds; v1 app still works exactly as before (no code in sync/auth paths yet is wired in); `.env.example` is committed; GitHub Actions exposes the two env vars to the build.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stand up the auth client, the store-level hooks the sync engine needs, and the plumbing for tearing local cloud-synced data down on sign-out. Every user story below depends on this phase.

**⚠️ CRITICAL**: Every US phase depends on this phase.

- [X] T009 Implement `src/auth/supabase.ts` — single `createClient()` call per [contracts/sync-protocol.md §1](./contracts/sync-protocol.md); use `storageKey: 'fts.auth'` to keep the v1 `fts.v1` key untouched; export typed `supabase` client; export a boolean `isSupabaseConfigured` that is `false` when either env var is missing (degrades to local-only mode silently, per [contracts/env-contract.md](./contracts/env-contract.md))
- [X] T010 Implement `src/auth/AuthProvider.tsx` and `src/auth/useAuth.ts` — React context holding `{ status: 'loading' | 'signedOut' | 'pendingMagicLink' | 'signedIn', userId, email, pendingEmail, lastMagicLinkSentAt }`; subscribes to `supabase.auth.onAuthStateChange`; calls `getSession()` at mount; exposes `requestMagicLink(email)` (calls `signInWithOtp({ email, options: { emailRedirectTo: <hash-callback URL>, shouldCreateUser: true } })`, moves state to `pendingMagicLink`, stamps `lastMagicLinkSentAt`, enforces 30 s cooldown returning an error if violated), `resendMagicLink()` (same as request but reuses `pendingEmail`), `cancelMagicLink()` (drops back to `signedOut`), and `signOut()`; when `isSupabaseConfigured === false`, hook stays permanently in `signedOut` with no subscription
- [X] T011 Implement `src/routes/AuthCallbackRoute.tsx` — renders a single "Signing in…" line; calls `supabase.auth.exchangeCodeForSession(window.location.href)`; scrubs `?code` and the URL fragment via `window.history.replaceState` regardless of outcome; on success navigates to `/` with replace; on error renders an "This sign-in link has expired or was already used" screen with a single **Back to sign in** button that resets auth state and navigates to `/settings`
- [X] T012 Wire the auth callback route in [src/App.tsx](../../src/App.tsx): add `{ path: 'auth/callback', element: <AuthCallbackRoute /> }` to the router; wrap `StoreProvider` in a new `<AuthProvider>` (auth context must be available before store so the sync engine can read auth state)
- [X] T013 Extend `src/storage/localStorage.ts` with `clearAllCloudSyncedState()` — removes key `fts.v1` only (Supabase's own `fts.auth` is cleared by `supabase.auth.signOut()`); export from module
- [X] T014 Extend [src/state/store.tsx](../../src/state/store.tsx) with a `useStoreInternals()` escape hatch that exposes `{ getState, subscribe, dispatch }` for the sync engine — no breaking changes to `useAppState` / `useAppDispatch`; keep it unexported from the public module barrel if one exists
- [X] T015 Implement `src/sync/syncStatus.ts` — types (`SyncStatusState = 'synced' | 'syncing' | 'offline' | 'error'`), a tiny in-module state holder with `subscribe(listener)` / `get()` / `set(next, lastSyncedAt?, lastError?)`; zero dependencies
- [X] T016 Unit test in `tests/unit/syncStatus.test.ts` — subscribe receives the latest state synchronously on set; multiple subscribers each get the update; `get()` matches last `set()`

**Checkpoint**: `AuthProvider` boots; signed-out state is observable via `useAuth()`; `clearAllCloudSyncedState()` wipes `fts.v1`; sync status is an independent observable module. Nothing yet talks to Supabase on the data path.

---

## Phase 3: User Story 3 - Stay purely local if I choose (Priority: P1)

**Goal**: Prove the v1 experience is untouched for signed-out users — zero network calls, no sign-in gate, existing local data intact. This phase is listed first because it is the lowest-risk and provides the regression harness for every other phase.

**Independent Test**: Run the app with a cleared auth session. Add tasks, complete them, reload. Inspect Network tab: zero requests to `*.supabase.co`. Add a signed-out unit test that spies on `fetch` and `WebSocket` while replaying 10 reducer actions and asserts 0 calls.

### Implementation for User Story 3

- [X] T017 [US3] Add a conditional render in [src/routes/SettingsRoute.tsx](../../src/routes/SettingsRoute.tsx): when `auth.status === 'signedOut'` and `isSupabaseConfigured`, show a single calm "Sign in to sync across devices" section (not a nag) containing the `SignInForm`; when `!isSupabaseConfigured`, render nothing — preserves v1 UX on any build without env vars
- [X] T018 [P] [US3] Implement `src/components/SignInForm.tsx` + `src/components/SignInForm.css` — three visual states driven by `useAuth()`: (a) email input + "Send magic link" button (validates email shape, disables submit while pending), (b) "Check your email" state showing `auth.pendingEmail` and a **Resend email** button disabled until `Date.now() - lastMagicLinkSentAt ≥ 30_000`, plus a "Use a different email" link that calls `cancelMagicLink()`, (c) error toast if `requestMagicLink` throws; min tap 44×44 on every control
- [X] T019 [US3] Unit test in `tests/unit/noNetworkWhenSignedOut.test.ts` — mount `<AuthProvider><StoreProvider>{appRoot}</StoreProvider></AuthProvider>` in jsdom; spy on `global.fetch` and `global.WebSocket`; run a scripted sequence of 10 reducer actions (add / complete / delete across tasks, categories, statuses); assert `fetch` called 0 times and no WebSocket opened (maps to SC-005, FR-017)
- [X] T020 [US3] E2E assertion in `tests/e2e/cloud-sync.spec.ts` (will grow across phases — seed the file here): `test('signed-out mode makes no Supabase calls')` — navigate to `/`, install a route-level network intercept that asserts any request to a `*.supabase.co` host fails the test, drive the v1 add/complete flow, pass

**Checkpoint**: US3 is provable. The app still works identically to v1 for signed-out users. Network-negative tests run green.

---

## Phase 4: User Story 1 - Sign in and start syncing (Priority: P1) 🎯 MVP

**Goal**: A user can request a magic-link email, click the link, and their AppState syncs to a per-user `profiles` row via Supabase. Two devices signed in with the same email see the same data after pull-on-auth.

**Independent Test**: Smoke Part B + Part C from [quickstart.md](./quickstart.md) — sign in on device A, add a task, sign in on device B as the same user, assert the task is there within 10 seconds.

### Implementation for User Story 1

- [X] T021 [P] [US1] Implement `src/sync/__mocks__/supabase-client.ts` — a hand-rolled mock exposing `.from(table).select().eq().maybeSingle()`, `.insert()`, `.upsert().select().single()`, `.channel().on().subscribe()`, `.auth.onAuthStateChange()`, `.removeChannel()`; mock stores an in-memory per-user row; used by syncEngine unit tests (no real Supabase calls in unit layer)
- [X] T022 [P] [US1] Implement `src/sync/SyncEngine.ts` — constructor takes `{ supabase, auth, store, syncStatus }`; exposes `start()` (subscribes to `auth` and `store`), `stop()` (tears everything down); internal `SyncContext` per [data-model.md](./data-model.md); methods:
  - `pullOnAuth(userId)` — SELECT-or-INSERT pull-on-auth per [contracts/sync-protocol.md §3](./contracts/sync-protocol.md); on first-ever sign-in for this user, insert `seedState()`; if a local-only pre-existing AppState has user-authored content, call a provided `promptReplaceLocal()` callback (returns boolean) before applying cloud state
  - `schedulePush()` — debounced 1 s upsert per [contracts/sync-protocol.md §4](./contracts/sync-protocol.md); uses `src/lib/debounce.ts`; updates `SyncStatus` through the `syncStatus` module
  - `subscribeRealtime(userId)` / `unsubscribeRealtime()` — one `profile:<userId>` channel per [contracts/sync-protocol.md §5](./contracts/sync-protocol.md); suppresses self-echo via `lastCloudUpdatedAt`
  - `scheduleRetry()` — exponential backoff 30 s / 2 m / 5 m
- [X] T023 [P] [US1] Implement `src/sync/SyncProvider.tsx` — React component that instantiates one `SyncEngine`, calls `start()` on mount when `isSupabaseConfigured`, `stop()` on unmount; passes a `promptReplaceLocal` that resolves to `true` when the local cache equals `seedState()` (nothing to lose), otherwise shows a modal with "Export my local data first" + "Replace with cloud data" / "Cancel sign-in" (the "Cancel" path triggers `supabase.auth.signOut()`)
- [X] T024 [US1] Wire `<SyncProvider>` into [src/App.tsx](../../src/App.tsx): `AuthProvider → StoreProvider → SyncProvider → RouterProvider`; verify signed-out users never construct a `SyncEngine` (guard in SyncProvider is simplest) so SC-005 is preserved
- [X] T025 [US1] Surface signed-in identity in [src/routes/SettingsRoute.tsx](../../src/routes/SettingsRoute.tsx): when `auth.status === 'signedIn'`, render the user's email + (optional) avatar, plus a **Sign out** button; hide the sign-in section in this state
- [X] T026 [US1] Unit tests in `tests/unit/syncEngine.test.ts` using the mocked Supabase client: (a) pull-on-auth inserts seed for a brand-new user id; (b) pull-on-auth replaces local state when a cloud row already exists; (c) pull-on-auth invokes `promptReplaceLocal` when the local store has non-seed data and honours its boolean; (d) a reducer action triggers exactly one upsert per debounce window even for a burst of 5 actions; (e) on upsert success, `syncStatus` transitions `'syncing' → 'synced'` and `lastCloudUpdatedAt` updates; (f) self-echo: a `postgres_changes` payload whose `updated_at ≤ lastCloudUpdatedAt` does NOT call `store.dispatch`
- [X] T027 [US1] E2E in `tests/e2e/cloud-sync.spec.ts`: `test('sign-in replaces local cache with cloud state')` — intercept the Supabase auth endpoints with Playwright's `page.route`; stub `signInWithOtp` to succeed without actually sending mail; drive the page to `#/auth/callback?code=fake` and stub `exchangeCodeForSession` to return a fixed session; seed the mocked `profiles` row via a REST intercept to contain a specific task title; assert that task appears in the active list within 10 s

**Checkpoint**: US1 MVP shipped. A signed-in user's data syncs to the cloud and pulls on load; two sessions (simulated via a second browser context) converge on the same state.

---

## Phase 5: User Story 2 - Keep using the app offline while signed in (Priority: P1) 🎯 MVP

**Goal**: Signed-in users can edit offline; changes queue locally and replay to the cloud automatically once online. Cross-device convergence still wins within 10 s. Last-write-wins by server-side `updated_at` decides conflicts.

**Independent Test**: Smoke Part D from [quickstart.md](./quickstart.md) — go offline, make three changes, go online; within 10 s the cloud reflects them and device B picks them up via realtime.

### Implementation for User Story 2

- [X] T028 [P] [US2] Add online/offline listeners in `src/sync/SyncEngine.ts`: on `window.addEventListener('offline', …)` set `syncStatus → 'offline'` and stop arming the debounce; on `'online'` if the in-memory store is dirty relative to `lastCloudUpdatedAt`, fire an immediate upsert (no debounce wait) and resume normal scheduling
- [X] T029 [P] [US2] Add upsert-failure classification in `src/sync/SyncEngine.ts`: network / AbortError / fetch-failed → `'offline'` + `scheduleRetry()`; `AuthApiError` (token revoked / expired) → force `supabase.auth.signOut()` to return the app to a clean signed-out state; other errors → `'error'` with a short `lastError` string and retry
- [X] T030 [US2] Unit tests in `tests/unit/syncEngine.test.ts` (append): (a) offline-then-online — simulate `navigator.onLine = false` and an `'offline'` event, dispatch 3 actions, assert 0 upserts, flip online, assert 1 upsert carrying the most recent state; (b) server-side `updated_at` drives LWW — when two incoming realtime payloads arrive, the one with the later `updated_at` wins even if received out of order; (c) backoff schedule — first network failure schedules retry at 30 s, second at 2 m, third+ at 5 m, a success resets to 0
- [X] T031 [US2] E2E in `tests/e2e/cloud-sync.spec.ts`: `test('offline edits replay after reconnect')` — use Playwright `context.setOffline(true)`, perform three edits, assert instant UI feedback and sync badge `'Offline — will sync when online'`, go back online, assert upsert fires and badge returns to `'Synced'` within 10 s

**Checkpoint**: Offline-first holds. SC-002 and SC-003 are verifiable. Users on flaky networks experience zero interrupted edits.

---

## Phase 6: User Story 4 - Sign out cleanly (Priority: P2)

**Goal**: Signing out returns the app to a clean signed-out state on *this device* and does not touch cloud data or other devices. Private/shared-device scenario is safe.

**Independent Test**: Smoke Part E from [quickstart.md](./quickstart.md).

### Implementation for User Story 4

- [X] T032 [P] [US4] Implement `src/components/SignOutButton.tsx` — confirm-dialog ("Sign out of this device? Your cloud data stays safe.") → `useAuth().signOut()`; rendered only when `auth.status === 'signedIn'`
- [X] T033 [US4] Extend `useAuth().signOut()` (in `src/auth/useAuth.ts` / `AuthProvider.tsx`) to run the local teardown sequence atomically: (1) `SyncEngine.stop()` (unsubscribes realtime, cancels pending debounce), (2) `clearAllCloudSyncedState()`, (3) `supabase.auth.signOut()`, (4) dispatch `replaceState(seedState())` so the UI flips to empty immediately, (5) `syncStatus.set('synced')` so a stale `'offline'` badge does not linger
- [X] T034 [US4] Unit tests in `tests/unit/signOut.test.ts` — after signing out: (a) `localStorage.getItem('fts.v1')` is null (or re-seeded empty); (b) `syncEngine` is stopped (no pending timer, no active channel); (c) rendering the app again shows a signed-out shell with zero cloud tasks
- [X] T035 [US4] E2E in `tests/e2e/cloud-sync.spec.ts`: `test('sign-out wipes the local device only')` — sign in, add a task, sign out, reload, assert signed-out + empty; sign in again, assert the cloud-preserved task reappears

**Checkpoint**: Handing a phone to a friend after signing out doesn't leak anything. Repeated sign-in/sign-out cycles are stable.

---

## Phase 7: User Story 5 - Know what's happening with my data (Priority: P2)

**Goal**: Users can glance at a calm indicator and know whether their latest edit is in the cloud, in flight, or queued offline.

**Independent Test**: Make rapid edits online and watch the badge flicker `'Syncing…' → 'Synced'`. Toggle offline in DevTools and watch it flip to `'Offline — will sync when online'`. No red modals ever appear.

### Implementation for User Story 5

- [X] T036 [P] [US5] Implement `src/components/SyncStatusBadge.tsx` + `src/components/SyncStatusBadge.css` — subscribes to `syncStatus` (from Phase 2 T015); renders a pill with one of four messages ("All changes synced", "Syncing…", "Offline — will sync when online", "Sync paused — tap to retry"); retry affordance calls `SyncEngine.triggerImmediatePush()`; respects `prefers-reduced-motion`
- [X] T037 [US5] Render `<SyncStatusBadge />` in [src/routes/SettingsRoute.tsx](../../src/routes/SettingsRoute.tsx) only when `auth.status === 'signedIn'`; preserve the existing Settings layout, add a small "Last synced: {relative time}" secondary line under the badge using `prefs.lastExportAt`-style relative formatting (new helper `src/lib/relativeTime.ts` if none exists)
- [X] T038 [US5] Unit test in `tests/unit/syncStatusBadge.test.tsx` — rendering maps every `SyncStatusState` value to the expected visible copy; clicking the retry button when state is `'error'` calls the engine's immediate-push method

**Checkpoint**: Silent sync replaced by calm, honest visibility. Principle III holds — no nag, no red, no modal.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Run the security verification gate called out in the plan, update docs, and measure bundle growth against the Principle V budget.

- [X] T039 [P] Security gate — verify locally: run `npm run build && grep -r -n --include='*.js' --include='*.css' --include='*.html' --include='*.map' service_role dist/`. MUST print nothing. Matches CI step from T006; having both means a regression gets caught by whichever fires first
- [X] T040 [P] Cross-user RLS integration check (one-time, manual, documented in [quickstart.md](./quickstart.md) Part F). If a Supabase CI bot account is set up later, turn this into a scheduled (not per-PR) CI job that signs in as two test users and asserts user B's SELECT on user A's row returns 0 rows (SC-004)
- [X] T041 [P] Bundle growth check — run `npm run build` and record the gzipped `dist/assets/index-*.js` size. Assert growth vs the v1 baseline (78.21 KB gz) is ≤ 50 KB gz (SC-007). Log the number in the PR description
- [X] T042 [P] Update [README.md](../../README.md) "Cloud sync setup" section to reference the final [quickstart.md](./quickstart.md) parts A–F; add a "Sync is optional" paragraph so any reader can tell the local-only mode is a first-class path
- [X] T043 [P] Accessibility pass on the new components: `SignInButton`, `SignOutButton`, `SyncStatusBadge` all keyboard-reachable with visible focus styles and WCAG AA contrast; the replace-local-with-cloud modal has `role="dialog"`, labelled heading, and focus trap
- [X] T044 Walk the full [quickstart.md](./quickstart.md) smoke test (Parts A–F) on a real mobile viewport or 390×844 emulation and fix any gaps before considering the feature done

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code dependencies; T001–T008 can mostly go in parallel after T001 installs the dep
- **Foundational (Phase 2)**: Depends on Phase 1 complete; BLOCKS all user stories
- **US3 (Phase 3, P1)**: Depends on Phase 2 — lightweight, run first to establish the regression harness before riskier sync code lands
- **US1 (Phase 4, P1)**: Depends on Phase 2; US3 not required but recommended first
- **US2 (Phase 5, P1)**: Depends on Phase 4 (extends SyncEngine behavior)
- **US4 (Phase 6, P2)**: Depends on Phase 4 (needs a working signed-in flow to test sign-out)
- **US5 (Phase 7, P2)**: Depends on Phase 4 (sync states only meaningful when sync is active)
- **Polish (Phase 8)**: Depends on all user stories you intend to ship

### Within Each User Story

- Components marked [P] are on different files and can go in parallel
- Route-level wiring follows its components
- Tests extending an existing test file are sequential w.r.t. that file

### Parallel Opportunities

- Phase 1 after T001: T002, T003, T004, T005, T007 are all [P]
- Phase 2: T015/T016 can go after T014; T011 parallel with T009/T010
- US1: T021/T022/T023 are [P]
- US2: T028/T029 are [P]
- Polish: T039–T043 all [P]

---

## Parallel Example: User Story 1

```bash
# Three sync-engine pieces in parallel:
Task: "T021 [P] [US1] src/sync/__mocks__/supabase-client.ts"
Task: "T022 [P] [US1] src/sync/SyncEngine.ts"
Task: "T023 [P] [US1] src/sync/SyncProvider.tsx"

# Then wire into the app (sequential, same file):
Task: "T024 [US1] Wire <SyncProvider> into src/App.tsx"
Task: "T025 [US1] Surface signed-in identity in SettingsRoute"

# Tests once code lands:
Task: "T026 [US1] Unit tests for SyncEngine"
Task: "T027 [US1] E2E for sign-in + cloud pull"
```

---

## Implementation Strategy

### MVP first (US3 → US1 → US2)

1. Phase 1 Setup (T001–T008)
2. Phase 2 Foundational (T009–T016)
3. Phase 3 US3 (T017–T020) — lock in the signed-out no-network invariant before anything else
4. Phase 4 US1 (T021–T027) — first working sign-in + cloud pull
5. Phase 5 US2 (T028–T031) — offline-first hardening
6. **STOP AND VALIDATE**: Walk [quickstart.md](./quickstart.md) Parts A–D. Deploy behind the env vars.

### Incremental delivery after MVP

- US4 (sign-out wipe, T032–T035) → deploy
- US5 (sync status UX, T036–T038) → deploy
- Polish (T039–T044) → run gate checks, measure bundle, ship

### Notes

- [P] = different file, no dependency on an incomplete task
- Commit after each task or logical group (matches the `after_*` git hooks in [.specify/extensions.yml](../../.specify/extensions.yml))
- Stop at any Checkpoint to validate the story before moving on
- Never weaken a Principle I–V commitment without a constitutional amendment
