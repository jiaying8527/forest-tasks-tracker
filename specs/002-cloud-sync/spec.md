# Feature Specification: Cloud Sync

**Feature Branch**: `002-cloud-sync`
**Created**: 2026-04-17
**Status**: Draft
**Input**: User description: "Add cloud sync to Forest Tasks Tracker so my tasks and forest survive across browsers and devices. Users sign in with an email magic link via Supabase. When signed in, all task / category / status / forest state syncs to a personal Supabase row so opening the app on another device (after signing in with the same email address) restores everything. Offline-first: all edits go to local cache first and sync in the background. Row Level Security is mandatory — each user can only read/write their own rows. Sync is opt-in: users who don't sign in keep using the app purely locally. For this first version, start fresh — no migration of existing local-only data into the cloud on first sign-in."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and start syncing (Priority: P1)

As a user who wants my tasks to survive across devices, I want to sign in
with my email address so the app starts saving my data to the cloud
automatically from that moment on.

**Why this priority**: Without sign-in and basic sync, the feature delivers
nothing. This is the MVP slice.

**Independent Test**: On a fresh install, tap "Sign in", enter an email
address, receive a magic-link email, click the link on the same device,
land back in the app signed in. Settings shows the email and a "signed in"
indicator. Add a task → open the same URL in a second browser (or a
private window) → sign in with the same email address → the task is
already there.

**Acceptance Scenarios**:

1. **Given** a new, signed-out user, **When** I enter my email and tap
   "Send magic link", **Then** I see a "Check your email" confirmation
   that displays the email address I entered, and I receive an email
   within a minute containing a one-tap sign-in link.
2. **Given** I clicked my magic link, **When** the browser opens the app,
   **Then** I am signed in, my email is visible in Settings, and sync is
   active.
3. **Given** I sign in on device A and add a task, **When** I sign in
   with the same email address on device B, **Then** I see the same task,
   the same categories/statuses, and the same forest within 5 seconds of
   the app loading.
4. **Given** the user never opens the magic-link email, **When** they
   return to the app, **Then** their local data is unchanged and the app
   continues to work in purely local mode.
5. **Given** a magic link that has expired or has already been used,
   **When** the user clicks it, **Then** they are shown a clear "this
   link has expired, please request a new one" state with a one-tap way
   to restart the flow, and no half-signed-in state exists.
6. **Given** the email provider delivers with delay or to spam, **When**
   more than 60 seconds pass with no email, **Then** the user can request
   a new magic link from the same screen; the app MUST rate-limit resends
   to at most one every 30 seconds to respect the SMTP free tier.

---

### User Story 2 - Keep using the app offline while signed in (Priority: P1)

As a signed-in user on a flaky connection, I want the app to keep working
normally — add / complete / edit / delete tasks — without waiting on the
network, and then quietly catch up once I'm back online.

**Why this priority**: Offline-first is the only honest way to ship sync on
mobile. Without it, every subway ride breaks the app and users stop trusting
it. This is the second MVP slice.

**Independent Test**: With Network tab set to offline (or airplane mode on a
real device), open the app → add three tasks, complete one, edit another,
delete a category → every action feels instant. Switch back to online →
within 10 seconds, all four changes appear in the Supabase row (verified by
opening a second device signed in as the same user).

**Acceptance Scenarios**:

1. **Given** I'm signed in and offline, **When** I add, edit, complete, or
   delete a task, **Then** the change appears immediately in the UI and
   persists across a page reload.
2. **Given** I made changes offline, **When** my device comes back online,
   **Then** those changes are uploaded to the cloud within 10 seconds
   without me taking any action.
3. **Given** the same record was edited on two devices while one was
   offline, **When** both devices are online, **Then** the app applies a
   deterministic last-write-wins rule (by a server-recorded per-record
   timestamp) and converges to a single state on both devices within 10
   seconds.
4. **Given** the cloud is temporarily unreachable for minutes,
   **When** the user keeps working, **Then** no error modal blocks them;
   a subtle "syncing will resume" indicator is acceptable but not required.

---

### User Story 3 - Stay purely local if I choose (Priority: P1)

As a user who doesn't want an account, I want the app to keep working
exactly as it did in v1 — fully local, no sign-in prompt forcing me into
the cloud.

**Why this priority**: The constitution (Principle II) requires sync to be
opt-in. Shipping sync must not regress the local-only experience, or we've
broken an existing working product.

**Independent Test**: Open a fresh install → never sign in → add tasks,
complete them, see the forest → close and reopen → everything still there.
Check Network tab: zero requests to Supabase.

**Acceptance Scenarios**:

1. **Given** a signed-out user, **When** they use the app, **Then** no
   network calls to the backend are made by task / forest / category /
   status operations.
2. **Given** a signed-out user, **When** they open the app after previously
   adding tasks locally, **Then** their data is exactly as they left it,
   with no "you need to sign in" gate.
3. **Given** a signed-out user, **When** they tap Settings, **Then** they
   see a single "Sign in to sync across devices" entry point that is not
   nagging and not blocking.

---

### User Story 4 - Sign out cleanly (Priority: P2)

As a signed-in user, I want to sign out in a way that leaves me clearly
either local-only or gone from this device, so I can hand my laptop to
someone without leaking my data.

**Why this priority**: Sign-out without a clear data-handling story is a
privacy bug waiting to happen. Important but not MVP.

**Independent Test**: Sign in on a device, add a task, sign out → the local
cache is cleared on this device, the app returns to a clean signed-out
state, and reopening the app shows an empty, signed-out tracker. Data
remains intact in the cloud and on any other signed-in device.

**Acceptance Scenarios**:

1. **Given** I'm signed in, **When** I tap "Sign out" in Settings and
   confirm, **Then** I am returned to a signed-out state on this device,
   the local cache for my cloud-synced data is cleared, and the app no
   longer makes authenticated network calls.
2. **Given** I signed out, **When** I sign back in on the same device,
   **Then** my cloud data is restored locally.
3. **Given** I signed out, **When** someone else opens this browser,
   **Then** they see a clean signed-out app with no residue of my data.

---

### User Story 5 - Know what's happening with my data (Priority: P2)

As a signed-in user, I want clear, calm indicators of sync state so I can
tell whether my last edit made it to the cloud or is queued locally.

**Why this priority**: Users trust offline-first systems when they can see
what's happening. Silent sync breeds suspicion.

**Independent Test**: While making edits both online and offline, a single
sync-state indicator in Settings (or a small badge) changes between
"synced", "syncing…", and "offline — will sync when online". Never a red
banner, never a modal.

**Acceptance Scenarios**:

1. **Given** I'm online and up to date, **When** I view Settings,
   **Then** I see a calm "All changes synced" indicator.
2. **Given** I'm offline, **When** I make an edit, **Then** the indicator
   shows "Offline — will sync when online".
3. **Given** a sync is mid-flight, **When** I watch the indicator,
   **Then** it briefly shows "Syncing…" and returns to "Synced" within
   a few seconds.

---

### Edge Cases

- **First sign-in on a device that already has local data**: For v1 the
  local-only data is NOT migrated to the cloud; the signed-in experience
  starts from the cloud state (empty for a brand-new account). The user
  MUST be warned before the local cache is replaced, with a one-tap
  "Export my local data first" shortcut. This is explicit scope for v1.
- **Multiple email addresss**: Each email address is its own universe.
  Signing in as `a@example.com` then later as `b@example.com` on the same
  device MUST NOT mix data. The sign-out flow clears the local cache
  to enforce this.
- **Revoked session**: If the auth token is revoked or expires without a
  successful refresh, the next sync call fails with an auth error and the
  app returns to a signed-out state; the local cache is left empty, so
  there is no orphaned data for the next user of this device.
- **Clock skew**: Since last-write-wins uses a *server-recorded*
  timestamp (not the client's clock), device clock drift does not
  corrupt ordering.
- **Private/incognito windows**: Sign-in works but storage is session-
  scoped by the browser; the user is told that a private window
  empties its sync tokens on close.
- **Account deletion from within the app**: Out of scope for v1 — user
  can remove the Supabase row manually via the dashboard if absolutely
  needed. A proper delete-account flow is a follow-up.
- **Row Level Security failure**: If RLS is misconfigured such that a
  user can read another user's rows, this is treated as a Sev-1
  incident; the feature MUST be designed so that an RLS misconfiguration
  is detectable by a test before shipping.
- **Data loss on the cloud**: Users MUST still be able to export a
  local JSON snapshot regardless of sync state. The backend is a
  convenience, not a sole source of truth.
- **Quota / rate limits on the free tier**: For the expected personal
  user volume (< 10 writes/minute steady state) we stay well inside the
  free tier. If free-tier limits are ever breached, the app degrades to
  "offline — will sync when online" rather than failing edits.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**
- **FR-001**: The app MUST allow users to sign in with an email magic
  link — the user enters an email address, the auth provider emails a
  one-time sign-in link, and clicking the link signs them in. No
  password is ever collected, stored, or transmitted.
- **FR-002**: The app MUST NOT require sign-in to use any feature delivered
  in v1 (tasks, categories, statuses, forest). Sign-in is opt-in.
- **FR-003**: The app MUST expose a clear "Sign out" control for signed-in
  users that, on confirmation, clears the local cache of cloud-synced data
  and returns the app to a clean signed-out state.
- **FR-004**: The app MUST NOT store a password or any credential that
  could be recovered from the client; authentication state consists of
  the provider-issued session token only.

**Sync behavior**
- **FR-005**: While signed in, the app MUST persist every change to the
  local cache first and reflect it in the UI before any network call —
  the user never waits on the network for an edit to succeed.
- **FR-006**: While signed in and online, the app MUST propagate local
  changes to the cloud within 10 seconds of the change.
- **FR-007**: While signed in, the app MUST pull the cloud state for the
  current user on app load and reconcile it with the local cache.
- **FR-008**: The app MUST apply a deterministic last-write-wins rule
  based on a server-recorded per-record timestamp to resolve the same
  record being edited on two devices.
- **FR-009**: The app MUST converge two signed-in devices to the same
  visible state within 10 seconds of both being online.
- **FR-010**: The app MUST treat the cloud as eventually consistent —
  the UI never blocks on a sync confirmation.

**Data scope**
- **FR-011**: The synced data MUST cover tasks, categories, statuses,
  forest (trees), and user preferences — i.e. everything the v1 app
  persists locally.
- **FR-012**: For v1, on first sign-in, the app MUST NOT automatically
  upload existing local-only data to the cloud. Instead, the app MUST
  warn the user that signing in will replace their local cache with
  their cloud data, and offer a one-tap "Export my local data first"
  shortcut before continuing.

**Security (MUST — maps to Constitution Principle II v2.0.0)**
- **FR-013**: Every cloud table that holds user data MUST enforce Row
  Level Security such that a user can only read or write rows they own.
- **FR-014**: The app MUST NOT ship any admin-scoped credential (e.g., a
  backend `service_role` key) in the client bundle, client-side
  environment files, or any git-tracked file.
- **FR-015**: The publishable/anon key is the only backend credential
  allowed in the client.
- **FR-016**: Cross-user data leakage MUST be verifiable by an automated
  test: given two signed-in users A and B, the client MUST receive
  zero rows for the other user when querying.

**Local-only mode preservation**
- **FR-017**: A signed-out user MUST observe zero network calls to the
  backend from task / forest / category / status operations.
- **FR-018**: The local JSON export/import feature from v1 MUST remain
  available regardless of sign-in state.

**Feedback**
- **FR-019**: The app MUST expose a calm sync-state indicator with at
  least three values: "Synced", "Syncing…", and "Offline — will sync
  when online".
- **FR-020**: Sync errors MUST NOT raise blocking modals; they are
  surfaced via the same calm indicator (with a retry affordance if
  useful) and MUST NOT prevent the user from continuing to edit.

### Key Entities

- **User Session**: Represents a signed-in user's identity and access
  token to the backend. Fields: user id, email, token expiry. Not
  persisted beyond what the auth provider requires in local storage.
- **Cloud Snapshot**: The per-user record(s) in the backend holding
  tasks / categories / statuses / trees / preferences — logically the
  same shape as the local AppState. Owned by exactly one user.
- **Sync Queue**: Pending local changes not yet confirmed by the cloud.
  Implementation detail; conceptually, each queued change targets one
  entity and has a direction (create/update/delete).
- **Last-write timestamp**: A server-assigned timestamp used as the
  tie-breaker for conflicting edits, recorded per entity at the moment
  of acceptance into the cloud.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from "first open the app" to "signed in
  via magic link and ready to use" in under 90 seconds on a typical
  mobile connection (accounting for email delivery latency).
- **SC-002**: A change made on device A is visible on device B (signed in
  as the same user) within 10 seconds of device B being online, in 95%
  of cases.
- **SC-003**: 100% of edits made while offline succeed in the UI
  immediately and replay to the cloud without user intervention once
  connectivity returns.
- **SC-004**: Zero cross-user data reads in an automated two-user
  integration test — each user sees only their own rows.
- **SC-005**: A signed-out user makes zero network calls to the backend
  during task / forest operations, verifiable by the Network tab in a
  dev-tools trace.
- **SC-006**: Running cost for a single active personal user stays at
  $0/month on the chosen backend's free tier.
- **SC-007**: The app's core bundle grows by less than 50 KB gzipped
  over the v1 baseline to add sync (preserving Principle V).

## Assumptions

- **Provider choice**: Email magic link via Supabase Auth is the chosen
  v2 sign-in method. Magic link was selected over OAuth to avoid
  requiring a credit card on a third-party developer console, and over
  email+password to avoid credential custody (no password reset flow,
  no password-strength / reuse problems). Other providers may be added
  later but are out of scope for this version.
- **Single cloud record shape**: For v1 the cloud state is a per-user
  snapshot (one row or one logical document per user) rather than a
  table-per-entity normalization. This simplifies sync at our scale
  (thousands of tasks per user, not millions).
- **Conflict policy**: Last-write-wins at the entity level (per task,
  per category, per status). No three-way merge for a single task's
  fields.
- **Device uniqueness**: No device registration; the session token
  uniquely identifies a device-session and is sufficient.
- **No migration for v1**: Users who already have local data on their
  v1 install will NOT see that data appear in the cloud when they
  first sign in. They are warned and offered a local export before
  their local cache is replaced by cloud state.
- **No multi-tab coordination**: If the same user opens two tabs on
  one device, the last edit across both tabs wins via the same server
  timestamp rule. A BroadcastChannel-based in-tab coordination is a
  nice-to-have, not v1.
- **Quota assumption**: Free tier accommodates expected personal usage
  (approximate upper bound: one user, ≤ 10 writes/minute steady state,
  ≤ 50 MB of stored data per user).
- **Regional latency**: The app is acceptable for users anywhere that
  can reach the backend region with < 500 ms round-trip. Region choice
  is handled in deployment config, not at the spec level.
- **Account switching on one device**: Supported by signing out then
  signing back in; there is no in-app account switcher in v1.
