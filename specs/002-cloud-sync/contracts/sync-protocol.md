# Sync Protocol Contract

**Feature**: 002-cloud-sync | **Date**: 2026-04-17

Defines the exact interaction between the client sync engine and
Supabase. This is the authoritative reference — any code that touches
auth or sync MUST conform to this document.

---

## 1. Client singletons

```ts
// src/auth/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'fts.auth',        // namespace so v1 localStorage is untouched
    flowType: 'pkce',
  },
  realtime: { params: { eventsPerSecond: 2 } },
});
```

- Exactly one Supabase client per app instance.
- `service_role` is never referenced here. Attempting to import it
  MUST fail the build.

## 2. Auth flow (email magic link)

**Request magic link** (called from `SignInForm` after the user enters
an email address):

```ts
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo:
      window.location.origin +
      window.location.pathname +
      '#/auth/callback',
    shouldCreateUser: true,
  },
});
```

On success the client flips to a "Check your email" state showing the
address the user typed, plus a **Resend email** button that is disabled
for 30 seconds after each send (FR rate-limit in the spec).

**Complete sign-in** (happens when the user clicks the link in the
email): the browser opens the app at `#/auth/callback?code=…`.
`AuthCallbackRoute` renders a "Signing in…" indicator and runs:

```ts
const { error } = await supabase.auth.exchangeCodeForSession(
  window.location.href,
);
// `onAuthStateChange('SIGNED_IN', session)` fires automatically after success.
// Regardless of outcome, remove ?code and fragment from the URL:
window.history.replaceState(null, '', window.location.pathname + '#/');
if (error) {
  // show: "This sign-in link has expired or was already used. Request a new one."
} else {
  navigate('/', { replace: true });
}
```

No half-signed-in state: if the exchange fails, the error screen only
offers "Back to sign in", which returns to the email-entry form.

**Sign out** (called from `SignOutButton`, guarded by a confirm):

```ts
await supabase.auth.signOut();
// then: teardown sync + clearAllCloudSyncedState()
```

## 3. Pull-on-auth

Runs once when `onAuthStateChange` transitions to `SIGNED_IN`, and also
on every full app load where a persisted session exists.

```ts
const { data, error } = await supabase
  .from('profiles')
  .select('state, updated_at')
  .eq('user_id', userId)
  .maybeSingle();

if (error) throw error;

if (!data) {
  // First-ever sign-in for this user: insert an empty-seeded state.
  await supabase.from('profiles').insert({
    user_id: userId,
    state: seedState(),  // empty defaults — per FR-012 "start fresh"
  });
  applyIncoming(seedState(), /* updated_at */ new Date().toISOString());
  return;
}

if (hasLocalUserData()) {
  // One-shot warning modal offering an export before overwrite.
  const ok = await showReplaceLocalWithCloudWarning();
  if (!ok) {
    await supabase.auth.signOut();
    return;
  }
}

applyIncoming(data.state, data.updated_at);
```

`applyIncoming(state, updated_at)` runs the existing reducer's
`replaceState` action and persists to `localStorage.fts.v1`, then sets
`lastCloudUpdatedAt = updated_at`.

## 4. Push on mutation (debounced)

The sync engine subscribes to the store. On every state-change tick:

```ts
if (auth.status !== 'signedIn' || !navigator.onLine) return;

clearTimeout(ctx.pendingTimer);
ctx.pendingTimer = setTimeout(async () => {
  syncStatus.set('syncing');
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, state: currentState },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single();

  if (error) {
    syncStatus.set(error.name === 'AuthApiError' ? 'error' : 'offline');
    scheduleRetry();   // exponential backoff 30s → 2m → 5m
    return;
  }

  ctx.lastCloudUpdatedAt = data.updated_at;
  ctx.backoffMs = 0;
  syncStatus.set('synced');
}, 1000);
```

Invariants:
- The debounce is **1 second**. A burst of edits collapses into one
  upsert.
- The reducer + localStorage write has already completed *before*
  the timer fires. The upsert is never in the user's hot path.

## 5. Realtime fan-out

Subscribed on sign-in, torn down on sign-out.

```ts
ctx.channel = supabase
  .channel(`profile:${userId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'profiles',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      const incoming = payload.new as { state: AppState; updated_at: string };
      if (
        ctx.lastCloudUpdatedAt &&
        incoming.updated_at <= ctx.lastCloudUpdatedAt
      ) {
        // Self-echo: our own upsert round-tripped. Ignore.
        return;
      }
      applyIncoming(incoming.state, incoming.updated_at);
    },
  )
  .subscribe();
```

Teardown:

```ts
if (ctx.channel) {
  await supabase.removeChannel(ctx.channel);
  ctx.channel = null;
}
```

## 6. Sign-out wipe

```ts
// src/storage/localStorage.ts
export function clearAllCloudSyncedState(): void {
  window.localStorage.removeItem(STORAGE_KEY);  // 'fts.v1'
  // Supabase's own session key 'fts.auth' is removed by
  // supabase.auth.signOut(). We don't touch it directly.
}
```

After wipe, the sync engine dispatches `replaceState(seedState())` so
the UI is a clean, empty, signed-out app instantly.

## 7. Offline behavior

- `navigator.onLine === false` → never enqueue an upsert; set
  `syncStatus = 'offline'`.
- `window.addEventListener('online', …)` → if the store is dirty
  relative to `lastCloudUpdatedAt`, fire an immediate upsert.
- Network errors during an upsert → `scheduleRetry()` with exponential
  backoff (30 s, 2 m, 5 m cap) and `syncStatus = 'offline'`.

## 8. Security invariants (tested)

1. `grep -r service_role dist/` returns no matches (CI-enforced in
   `.github/workflows/deploy.yml`).
2. Two-user CI integration test: user A writes; user B's SELECT
   returns zero rows.
3. Unit test with a fetch spy: signed-out operations cause zero
   `fetch` or `WebSocket` calls (maps to SC-005).
4. Unit test: sign-out clears `localStorage['fts.v1']` and dispatches
   `replaceState(seedState())`.
