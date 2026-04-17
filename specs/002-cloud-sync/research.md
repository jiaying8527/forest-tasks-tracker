# Phase 0 Research: Cloud Sync

**Feature**: 002-cloud-sync | **Date**: 2026-04-17

Every NEEDS CLARIFICATION from Technical Context is resolved below.

---

## 1. Backend choice

**Decision**: Supabase free tier (auth + Postgres + realtime).

**Rationale**:
- Locked in by the user and the Constitution v2.0.0 amendment.
- Single vendor for auth, DB, and realtime = one SDK, one RLS model,
  one dashboard. Matches Principle V (simplicity).
- Free tier is generous for a personal tracker (500 MB DB, 50K MAU,
  5 GB bandwidth, unlimited API requests per month at our rate).
- No server-side code to own; the client talks directly to Supabase
  over HTTPS using the publishable/anon key, with RLS enforcing
  per-row isolation.

**Alternatives considered**:
- **Firebase** — similar features but auth rules are less ergonomic
  for Postgres-style RLS thinking and its magic-link UX is less
  polished than Supabase's out of the box.
- **Rolling our own** — violates the constitution's free-tier
  constraint (we'd pay for hosting).

---

## 2. Authentication flow

**Decision**: Email magic link via
`supabase.auth.signInWithOtp({ email, options: { emailRedirectTo:
window.location.origin + window.location.pathname + '#/auth/callback' } })`.
Supabase emails the user a one-time PKCE-backed sign-in link. The
client does not ever see the user's password — because there isn't
one.

**Rationale**:
- Matches FR-001 (email magic link, no password custody).
- Zero third-party developer consoles, zero credit card required (a
  real blocker for Google Cloud Console). Everything is configured
  inside Supabase.
- Redirecting back to a hash-routed `#/auth/callback` works on
  GitHub Pages without server rewrites (same reason v1 uses hash
  routing).
- Supabase stores the session in localStorage under its own key and
  refreshes the token automatically. We never touch it directly.
- Supabase's default built-in SMTP handles personal-scale sends
  (free-tier budget: a few messages per hour) — more than enough
  for a single user signing in occasionally.

**Supabase dashboard configuration (one-time, documented in
quickstart)**:
1. Auth → Providers → **Email** → enable; enable "Confirm email";
   enable "Magic Link".
2. Auth → URL Configuration → add the GitHub Pages URL and
   `http://localhost:5173/` to **Site URL** and **Redirect URLs**
   (both including the `#/auth/callback` variant).
3. Auth → Email Templates → optionally customize the magic-link
   email copy; default is fine for v1.

**Alternatives considered**:
- **Google OAuth** — requires a credit card on file in Google Cloud
  Console (observed by the user); rejected to keep the project truly
  $0 and single-vendor.
- **Email + password** — adds credential custody, password reset
  flow, password-strength / reuse concerns. Magic link gets us the
  same "personal email as identity" without any of that. Aligns with
  Constitution II v2.0.0, which prohibits password custody.
- **Passkeys (WebAuthn)** — better UX once supported everywhere, but
  iOS Safari coverage is still uneven; magic link is the universal
  fallback anyway. Follow-up, not v1.

---

## 3. Cloud schema shape

**Decision**: One table, `public.profiles`, with one row per user:
- `user_id uuid primary key references auth.users on delete cascade`
- `state jsonb not null` — the full AppState blob
- `updated_at timestamptz not null default now()`

`state` is a JSONB snapshot with the exact shape the v1 client already
persists to localStorage under `fts.v1`.

**Rationale**:
- At our scale (≤ 2,000 tasks per user, ≤ 50 MB blob) a single JSONB
  column is a few tens of KB on the wire and trivially fast.
- Normalized tables would multiply RLS policies (4 tables × 3 policies
  = 12 policies), complicate partial-sync logic, and still not deliver
  anything the user can perceive differently.
- The blob is already the same shape localStorage holds, so there is
  *no serialization mapping layer* in the client. That is by design.
- `updated_at` is set server-side (`now()` on insert/update) so
  last-write-wins does not depend on a client clock (solves the
  clock-skew edge case from the spec).

**Alternatives considered**:
- **Normalized per-entity tables** — see Complexity Tracking. Rejected
  for the stated reasons.
- **Append-only ops log + server-side reducer** — even more moving
  parts; great for collaborative editing; overkill for a personal
  tracker.

---

## 4. Row Level Security

**Decision**: RLS enabled on `profiles`; four policies:
1. SELECT allowed iff `auth.uid() = user_id`
2. INSERT allowed iff `auth.uid() = user_id`
3. UPDATE allowed iff `auth.uid() = user_id` (both USING and WITH CHECK)
4. DELETE allowed iff `auth.uid() = user_id`

No service_role is ever used from the client, so any attempt to read or
write someone else's row via the anon key returns zero rows or a
permission error at the DB layer.

**Rationale**:
- Matches FR-013, FR-014, FR-015, FR-016 from the spec and
  Principle II from the constitution.
- Writing all four policies explicitly (vs a single FOR ALL policy)
  makes the CI test easy to read and debug when it inevitably fires
  in review.

**Alternatives considered**:
- **A single `FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id)` policy** — slightly terser, same
  effect. Either is acceptable; we'll use the explicit four for
  readability.

---

## 5. Sync protocol (client ↔ cloud)

**Decision**:
- **On auth state change to signed-in** (load + sign-in):
  1. Pull `state` for `user_id = auth.uid()`.
  2. If no row exists: insert one with the current local cache's
     *empty-seeded* shape — i.e. not the user's pre-sync local data —
     per FR-012 ("start fresh on first sign-in").
  3. If a row exists: warn the user once that signing in replaces
     their local cache with their cloud data, offer a one-tap local
     JSON export, then replace in-memory AppState with the cloud
     `state` and persist to localStorage under `fts.v1`.
- **On every local mutation** (reducer action that changes AppState):
  1. Write to localStorage immediately (existing v1 behavior).
  2. Schedule a debounced (1 s) upsert of the full blob to
     `profiles`. The debounce collapses bursts of edits.
- **On realtime `postgres_changes` for this user's row** (INSERT /
  UPDATE): replace in-memory AppState with the incoming `state` if
  `updated_at` is newer than the last locally-applied change;
  otherwise ignore (the change is our own echo).
- **On auth state change to signed-out**:
  1. Tear down the realtime subscription.
  2. Clear the local cache of cloud-synced data
     (`clearAllCloudSyncedState()`).
  3. Reseed to empty defaults (a clean signed-out app).

**Rationale**:
- Matches FR-005 (no-network-in-the-hot-path), FR-006 (< 10 s to
  cloud), FR-007 (pull on load), FR-008 (LWW by server timestamp),
  FR-009 (cross-device convergence).
- The debounce amortizes a burst of edits (e.g., marking 10 tasks
  complete in a row) into one upsert, which keeps us comfortably in
  the free-tier write-rate envelope.

**Alternatives considered**:
- **Throttle instead of debounce** — guarantees an upload every N
  seconds during sustained editing, but risks uploading a not-quite-
  final state more often. Debounce fits "people pick up their phone,
  do things for 30 seconds, put it down."
- **Per-entity upsert** — requires the normalized schema we rejected
  in Decision 3.

---

## 6. Offline behavior

**Decision**: The existing v1 reducer + localStorage path is the hot
path. The sync engine is a passive observer: it reads state and pushes
to the cloud, it does not sit in the way of a reducer action. When
offline, the debounced upsert fails, we retry with exponential backoff
(30 s → 2 m → 5 m, cap at 5 m), and the sync-state badge flips to
"Offline — will sync when online".

**Rationale**:
- Matches FR-005, FR-010, FR-020.
- Backoff is important to avoid hammering Supabase on a long offline
  stint.

**Alternatives considered**:
- **Service-worker Background Sync API** — only Chrome. Our users are
  half on iOS Safari. Rejected.
- **Persistent op queue in IndexedDB** — for a whole-blob upsert the
  localStorage copy *is* the queue; no separate queue needed.

---

## 7. Realtime (cross-device fan-out)

**Decision**: `supabase.channel('profile:' + userId)
.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles',
filter: 'user_id=eq.' + userId }, callback)`.

**Rationale**:
- Supabase realtime over Postgres logical replication fits our one-row
  model perfectly: any update to *my* row fires on every subscribed
  client.
- RLS also applies to realtime, so even if someone tries to subscribe
  to another user's row, they get nothing.

**Alternatives considered**:
- **Periodic polling** — wastes bandwidth and battery; cross-device
  latency is worse. Rejected.

---

## 8. Secrets hygiene

**Decision**:
- `VITE_SUPABASE_URL` — the project URL (public; ships in bundle).
- `VITE_SUPABASE_ANON_KEY` — the publishable/anon key (public by
  design; ships in bundle; RLS is what protects data).
- **`SUPABASE_SERVICE_ROLE_KEY` MUST NEVER appear** in any `.env`
  file tracked by git, any Vite env file that ships to the client,
  or anywhere in the repo.
- `.env.example` documents the two allowed vars and explicitly warns
  that `service_role` is forbidden in the client. The README repeats
  this.
- A CI step runs `grep -r -n --include='*.js' --include='*.css'
  --include='*.html' 'service_role' dist/` and fails the build if any
  match is found.

**Rationale**:
- Matches Constitution Principle II v2.0.0 and FR-014 / FR-015.
- The publishable key IS meant to be public — but only if RLS is
  correct. We rely on both.

---

## 9. Testing strategy

**Decision**:
- **Unit (Vitest)**:
  - `syncEngine.test.ts` — pull-on-auth, debounced push, realtime
    echo suppression, offline backoff, using a mocked Supabase
    client (`__mocks__/supabase-client.ts`).
  - `signOut.test.ts` — sign-out clears `fts.v1` and tears down
    subscriptions.
  - `noNetworkWhenSignedOut.test.ts` — spies on `fetch` and
    `WebSocket`; signed-out reducer actions MUST produce zero calls
    (SC-005).
- **Integration (two-user, optional / CI-only)**:
  - A small Node script signs in as two Supabase test users (created
    by hand for the first run, with secrets stored as GitHub Action
    secrets, not in the repo). User A writes a row; user B's SELECT
    MUST return zero rows. This is the SC-004 check.
- **E2E (Playwright)**:
  - `cloud-sync.spec.ts` — stubs the magic-link callback with a known
    session (bypasses SMTP in tests), then verifies: (a) sign-in →
    cloud pull replaces local cache, (b) offline edits replay after
    we drop the network stub, (c) sign-out clears local cache.

**Rationale**:
- Most of the value is in the unit layer; the integration test
  specifically addresses the Sev-1 RLS concern called out in the
  spec's edge cases.

**Alternatives considered**:
- **A full live-Supabase E2E on every PR** — slower, flakier, and
  pulls a secret into the main PR flow. We keep that on a
  cron-scheduled CI job instead.

---

## 10. Build & deploy changes

**Decision**:
- `.env.example` committed to the repo documenting the two env vars.
- Real env vars set in GitHub → repo → Settings → Secrets and
  variables → Actions → Variables (public, ok for publishable keys)
  and wired into the existing `.github/workflows/deploy.yml` as
  `env:` on the `build` job so Vite picks them up at build time.
- The deploy workflow gains a `service_role` grep step (see Decision 8).

**Rationale**:
- GitHub Actions variables are appropriate for publishable keys.
  Secrets would also work and are stricter, but since the anon key
  is meant to be public (and will be visible in the bundle anyway),
  using Variables matches their intent.

---

## Summary of decisions

| # | Area | Decision |
|---|------|----------|
| 1 | Backend | Supabase free tier (auth + Postgres + realtime) |
| 2 | Auth | `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: … } })` (email magic link) with hash-callback |
| 3 | Schema | Single `profiles` table, one row per user, JSONB `state` |
| 4 | RLS | Enabled; 4 explicit policies (SELECT/INSERT/UPDATE/DELETE) gated on `auth.uid() = user_id` |
| 5 | Sync protocol | Pull on auth-change; debounced 1s whole-blob upsert on each mutation; realtime `postgres_changes` for fan-out |
| 6 | Offline | Reducer+localStorage remain the hot path; sync is a passive observer with exponential backoff |
| 7 | Realtime | `supabase.channel` filtered on the user's own row |
| 8 | Secrets | Only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in client; `grep` for `service_role` in CI |
| 9 | Testing | Vitest unit (sync + sign-out + no-network), two-user CI integration for RLS, Playwright E2E |
| 10 | Build/deploy | Env vars via GH Actions Variables; workflow adds service_role grep |

All NEEDS CLARIFICATION resolved. Ready for Phase 1.
