# Implementation Plan: Cloud Sync

**Branch**: `002-cloud-sync` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-cloud-sync/spec.md`

## Summary

Add optional, offline-first cloud sync to the v1 Forest Tasks Tracker. A
user who signs in with an email magic link (handled by Supabase Auth) gets their
entire AppState — tasks, categories, statuses, trees, preferences — mirrored
into a single per-user row in a Supabase `profiles` table, keyed by
`auth.uid()` with Row Level Security enforcing strict isolation. The client
stays the source-of-truth locally: every edit goes to localStorage first and
the sync engine debounce-upserts a JSONB snapshot to Supabase in the
background. Realtime `postgres_changes` on the same row pushes cross-device
updates within seconds. A signed-out user is the v1 app, unchanged — zero
network calls, no sign-in gate.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20.x (build-time only)
**Primary Dependencies**: React 18, Vite 5, React Router 6, nanoid, vite-plugin-pwa, @supabase/supabase-js ^2.45
**Storage**: Browser localStorage (local cache + source of truth for signed-out users); Supabase Postgres `profiles` table (JSONB snapshot per user) for signed-in sync
**Testing**: Vitest (unit + integration for sync engine with a mocked Supabase client); Playwright mobile E2E for auth flow mock + local-only no-network verification
**Target Platform**: Static web app, same as v1 — hosted on GitHub Pages; Supabase free tier hosts auth + Postgres
**Project Type**: web (single-project web app + free-tier backend; no self-hosted server)
**Performance Goals**: Sign-in → usable app < 30 s (SC-001); cross-device sync < 10 s (SC-002); UI tap feedback remains < 100 ms (v1 budget preserved); sign-out + wipe < 1 s
**Constraints**: Bundle growth ≤ 50 KB gzipped over v1 (SC-007); $0/month free tier (SC-006); zero network calls while signed out (SC-005); zero cross-user reads verifiable by test (SC-004); offline-first — edits never block on network (FR-005)
**Scale/Scope**: One row per user; ≤ 2,000 tasks per user steady state; ≤ 50 MB JSONB per user; ≤ 10 writes/minute steady state per user — well inside the Supabase free tier

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Mobile-First, Always | ✅ PASS | Auth flow is an email input + "Send magic link" button + "Check your email" confirmation — all thumb-reachable; sync-state indicator is a subtle Settings line item; no new full-screen modals. |
| II. Local-First with Free-Tier Cloud Sync (v2.0.0) | ✅ PASS | Local cache is authoritative locally; Supabase is the sync backend; email magic link via Supabase Auth (no password custody, no OAuth provider registration); RLS enforced on the one table (`profiles`); `service_role` key explicitly banned from client; $0/month free tier; last-write-wins by server `updated_at`; JSON export/import preserved regardless of sign-in state. |
| III. Clean, Delightful UI (NON-NEGOTIABLE) | ✅ PASS | Sync surface is minimal: one Settings entry for sign-in, one sign-out control, one sync-state line. No nag modals, no red banners for sync hiccups — they degrade to "Offline — will sync when online". |
| IV. Forest Rewards Feel Magical, Not Gimmicky | ✅ PASS | Sync is orthogonal to the forest — the completion-moment animation is unchanged. Trees remain deterministic by task id, so the same forest renders identically on device A and device B after sync. |
| V. Simplicity & Performance | ✅ PASS | One new dep: `@supabase/supabase-js` (~25 KB gz in the core bundle). One new table, one RLS policy per operation, one debounced upserter. No new state library. Bundle budget: v1 was 78 KB gz → target ≤ 128 KB gz (room to spare against the 300 KB cap). |

**Security verification gate (added per Constitution v2.0.0)**:
- `grep -r service_role dist/` MUST return no matches — added as a build step.
- A two-user integration test MUST verify cross-user reads return zero rows.
- Offline edits MUST succeed with Supabase unreachable — tested with a Network-off path.

**Post-design re-check (after Phase 1)**: ✅ All principles still pass.
The single-row-per-user JSONB design is an explicit Principle V
choice (simplicity over normalization); it pulls its weight at our
scale and keeps the sync engine tiny. See Complexity Tracking for the
justification entry.

## Project Structure

### Documentation (this feature)

```text
specs/002-cloud-sync/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── supabase-schema.sql         # Table + indexes + RLS policies
│   ├── sync-protocol.md            # Client↔Supabase interaction contract
│   └── env-contract.md             # Env var names and provenance
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

New and modified files for this feature. Existing v1 files are referenced
only where they change.

```text
.env.example                        # NEW — documents VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
vite.config.ts                      # MODIFIED — no real change; env vars come from Vite directly
src/
├── auth/
│   ├── supabase.ts                 # NEW — createClient() singleton using publishable key only
│   ├── AuthProvider.tsx            # NEW — wraps the app; exposes useAuth()
│   ├── useAuth.ts                  # NEW — hook: { user, status, signIn, signOut }
│   # (auth/callback route lives at src/routes/AuthCallbackRoute.tsx below)
├── sync/
│   ├── SyncEngine.ts               # NEW — debounced upsert + realtime subscribe + pull-on-auth
│   ├── SyncProvider.tsx            # NEW — wires SyncEngine into StoreProvider via dispatch
│   ├── syncStatus.ts               # NEW — types and small reducer for "Synced / Syncing / Offline"
│   └── __mocks__/supabase-client.ts# NEW — test double for the sync engine unit tests
├── state/
│   └── store.tsx                   # MODIFIED — exposes dispatch + state to SyncEngine; no shape changes
├── components/
│   ├── SignInForm.tsx              # NEW — email input + "Send magic link" + "Check your email" state
│   ├── SignInButton.tsx            # NEW — opens the sign-in form in Settings
│   ├── SignOutButton.tsx           # NEW — signs out + clears local cache
│   └── SyncStatusBadge.tsx         # NEW — calm indicator in Settings
├── routes/
│   ├── SettingsRoute.tsx           # MODIFIED — adds sign-in / sign-out / sync-state blocks
│   └── AuthCallbackRoute.tsx       # NEW — completes the magic-link code exchange
├── storage/
│   └── localStorage.ts             # MODIFIED — new helper: `clearAllCloudSyncedState()` for sign-out
└── lib/
    └── debounce.ts                 # NEW — tiny debounce utility (no lodash)

tests/
├── unit/
│   ├── syncEngine.test.ts          # NEW — pull/push/realtime paths with mocked client
│   ├── signOut.test.ts             # NEW — sign-out wipes local synced data
│   └── noNetworkWhenSignedOut.test.ts # NEW — signed-out fetch/XHR spies record zero calls
└── e2e/
    └── cloud-sync.spec.ts          # NEW — stubbed magic-link callback + offline-edit replay + cross-tab sync

supabase/
└── migrations/
    └── 0001_profiles_rls.sql       # NEW — committed copy of contracts/supabase-schema.sql

.github/
└── workflows/
    └── deploy.yml                  # MODIFIED — adds a `grep -r service_role dist/` fail-on-match step
```

**Structure Decision**: Same single-project web app as v1. New concerns
(`auth/`, `sync/`) get their own folders rather than bolting onto
`state/`, to keep the sync engine testable in isolation. `supabase/` at
the repo root holds the committed SQL migration so the table and RLS
policies live under version control, even though they're applied via the
Supabase dashboard SQL editor (not a server-side migration tool).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Single JSONB blob per user, not normalized tables | At our per-user scale (≤ 2,000 tasks), writing/reading the whole blob is cheap (tens of KB) and eliminates per-entity sync, conflict, and RLS complexity | A normalized schema (`tasks`, `categories`, `statuses`, `trees` tables) would mean per-entity CRUD, per-entity RLS policies, and per-entity conflict resolution — weeks more work for a feature the user already gets locally for free |
| Debounced whole-blob upsert (1 s) vs event-streamed ops | Matches the coarse-grained cloud shape; a burst of edits collapses into one round-trip; same debounce fits the free-tier write-rate envelope | Event sourcing / per-op push would need an ops log, server-side replay, and a reconciliation strategy — outsized for a personal app |
