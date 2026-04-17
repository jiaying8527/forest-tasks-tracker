# Phase 1 Data Model: Cloud Sync

**Feature**: 002-cloud-sync | **Date**: 2026-04-17

The v1 AppState model (see [specs/001-forest-tasks-tracker/data-model.md](../001-forest-tasks-tracker/data-model.md)) does not change. What's new is where it lives when a user is signed in, and a small amount of session / sync-status state that lives only in memory.

---

## Existing entities (v1, unchanged)

`Task`, `Category`, `Status`, `Tree`, `Preferences`, `AppState` (root with
`schema`, `tasks`, `categories`, `statuses`, `trees`, `prefs`) — see
[../001-forest-tasks-tracker/data-model.md](../001-forest-tasks-tracker/data-model.md).
All invariants carry over.

---

## New persisted entity (cloud)

### `profiles` row — one per signed-in user

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | `uuid` (PK) | References `auth.users(id)` ON DELETE CASCADE. Set to `auth.uid()` on insert. |
| `state` | `jsonb` | The full AppState blob, identical in shape to what the client writes to `localStorage.fts.v1`. |
| `updated_at` | `timestamptz` | Server-assigned (`default now()`, trigger on update). The last-write-wins tie-breaker. |

**Invariants**:
- Exactly one row per user. Enforced by `user_id` as primary key.
- `state.schema` MUST match the client's `CURRENT_SCHEMA` constant.
  Future schema bumps include a migration path on both sides.
- `state` is never partially written. Every update replaces the entire
  blob atomically (one `UPDATE` statement, one JSONB value).
- RLS enforces `auth.uid() = user_id` on every operation (see
  [contracts/supabase-schema.sql](./contracts/supabase-schema.sql)).

**Size guidance**: a heavy personal user (1,000 active tasks + 1,000
completed) produces a blob around 300 KB. The JSONB column can hold
many MB; there's no concern at our scale.

---

## New in-memory-only entities (client)

These never leave the browser session; they are derived or short-lived.

### `AuthSession`

| Field | Type | Notes |
|-------|------|-------|
| `status` | `'loading' \| 'signedOut' \| 'pendingMagicLink' \| 'signedIn'` | Drives UI gating. `pendingMagicLink` is the "Check your email" state while the user waits on the magic-link email. |
| `userId` | `string \| null` | From `auth.users.id`. |
| `email` | `string \| null` | The email address associated with the session. Displayed in Settings. |
| `pendingEmail` | `string \| null` | The email the user most recently typed while in `pendingMagicLink` state. Displayed on the "Check your email" screen. Cleared on successful sign-in or back-to-form. |
| `lastMagicLinkSentAt` | `number \| null` | `Date.now()` of the most recent `signInWithOtp` call. Drives the 30 s resend-cooldown rate limit from FR-001 / acceptance scenario 6. |

Sourced from `supabase.auth.getSession()` + `onAuthStateChange`. Not
persisted by us; Supabase persists its own refresh token under
`localStorage.fts.auth`.

### `SyncStatus`

| Field | Type | Notes |
|-------|------|-------|
| `state` | `'synced' \| 'syncing' \| 'offline' \| 'error'` | Drives [`SyncStatusBadge`](../../src/components/SyncStatusBadge.tsx). |
| `lastSyncedAt` | `string \| null` | ISO timestamp of the last successful upsert. |
| `lastError` | `string \| null` | Human-readable reason — never shown as a blocking modal. |

Lives in memory only. Never leaves the browser, never shipped to the
cloud.

### `SyncContext` (private to the engine)

| Field | Type | Notes |
|-------|------|-------|
| `pendingTimer` | `number \| null` | Debounce handle for the next upsert. |
| `backoffMs` | `number` | Exponential backoff delay when upsert fails. Reset to 0 on success. |
| `lastCloudUpdatedAt` | `string \| null` | The `updated_at` of the most recent row the client has applied. Used to suppress self-echo on realtime. |
| `channel` | `RealtimeChannel \| null` | The subscribed Supabase realtime channel; torn down on sign-out. |

---

## State transitions

### Auth lifecycle

```text
   app boot
     │
     ▼
 ┌─────────┐  supabase.auth.getSession()
 │ loading │──────────────────────────────┐
 └─────────┘                              │
     │ no session                         │ session present
     ▼                                    ▼
 ┌───────────┐     signIn() resolves  ┌──────────┐
 │ signedOut │───────────────────────►│ signedIn │
 └───────────┘                        └──────────┘
     ▲                                    │
     │     signOut() + clearCache()       │
     └────────────────────────────────────┘
```

- On `loading → signedIn`: SyncEngine runs the **pull-on-auth** flow
  (see below), then subscribes to realtime.
- On `signedIn → signedOut`: SyncEngine unsubscribes, clears local
  cloud-synced cache (`clearAllCloudSyncedState()`), resets to a fresh
  empty AppState, and stops upserting.

### Sync lifecycle

**Pull on auth / reload**:
1. `SELECT state, updated_at FROM profiles WHERE user_id = auth.uid()`.
2. If the row is absent → `INSERT` the current in-memory (freshly seeded)
   state. For first-ever sign-in that is the empty-seed shape per
   FR-012.
3. If present and a pre-existing local-only AppState is in memory (i.e.
   the user had v1 data before signing in) → show the one-shot warning
   modal with "Export my local data first" before overwriting.
4. Replace in-memory AppState with the cloud `state`, persist to
   `localStorage.fts.v1`, record `lastCloudUpdatedAt`.

**Push on mutation** (debounced):
1. Every reducer action is a signal. Clear any existing `pendingTimer`.
2. Schedule a new timer for `1000 ms`.
3. On fire: `UPSERT INTO profiles (user_id, state) VALUES (..., ...)
   ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state,
   updated_at = now()`.
4. On success: reset `backoffMs = 0`; update `lastCloudUpdatedAt` from
   the returned row; `syncStatus → 'synced'`.
5. On error: increment `backoffMs` (30 s, 2 m, 5 m cap); `syncStatus →
   'offline'` (for network errors) or `'error'` (for others); schedule
   a retry at `backoffMs`.

**Realtime echo**:
1. `channel.on('postgres_changes', … filter: user_id=eq.$self …)` fires.
2. If `incoming.updated_at <= lastCloudUpdatedAt` → ignore (our own
   echo).
3. Else replace in-memory AppState with `incoming.state`, persist to
   `localStorage.fts.v1`, update `lastCloudUpdatedAt`.

---

## Validation rules

| Source | Rule |
|--------|------|
| FR-013, FR-014, FR-015, FR-016 | RLS on `profiles` MUST be enabled and every policy MUST gate on `auth.uid() = user_id`. |
| FR-005, FR-010 | Reducer actions MUST NOT await a sync call — every edit lands in localStorage before the sync path runs. |
| FR-007, FR-009 | Pull runs on both initial load (if signed in) and on every `onAuthStateChange('SIGNED_IN')` event. |
| FR-008 | `updated_at` is set server-side in both INSERT and UPDATE paths (via column default and an `updated_at = now()` trigger on update). |
| FR-012 | First-sign-in pull replaces the local cache; the warning-and-export affordance is mandatory before the replace. |
| FR-017, SC-005 | When `AuthSession.status !== 'signedIn'` the sync engine MUST NOT open a Supabase client connection. |
| FR-019 | `SyncStatus.state` MUST reflect reality across `'synced' / 'syncing' / 'offline' / 'error'`. |

---

## Derived views

- **Sign-in allowed?**: always (FR-002). A signed-out user is a valid
  first-class user.
- **Sync is active?**: `AuthSession.status === 'signedIn' &&
  navigator.onLine` — drives whether the debounce timer is armed.
- **Should warn before first sign-in replace?**: true iff the local
  cache contains any user-created data (tasks, non-seed categories,
  non-seed statuses, or trees). Otherwise the replace is silent.
