# Quickstart: Cloud Sync

**Feature**: 002-cloud-sync | **Date**: 2026-04-17

Steps to bring the sync feature up locally and verify it end-to-end.
Assumes v1 is already running (see
[../001-forest-tasks-tracker/quickstart.md](../001-forest-tasks-tracker/quickstart.md)).

---

## One-time Supabase setup (project owner only)

These steps happen **outside the codebase**, in the Supabase and
dashboard. You only do them once per Supabase project. No Google
Cloud Console account is required.

### A. Create the Supabase project (already done)

Project URL: `https://ewevafzbsfurirvrovil.supabase.co`.
Publishable / anon key: as provided.

### B. Apply the schema + RLS

1. Open the Supabase dashboard → **SQL → New query**.
2. Paste the full contents of
   [contracts/supabase-schema.sql](./contracts/supabase-schema.sql).
3. Click **Run**. You should see `Success. No rows returned`.
4. Verify under **Database → Tables**: `public.profiles` exists, RLS
   badge is on, and four policies are listed.

### C. Enable email magic-link auth

No third-party account needed. Everything is in Supabase.

1. Supabase dashboard → **Auth → Providers → Email** → toggle
   **Enable** on. Confirm both "Confirm email" and "Magic Link" are
   on. Save.
2. Supabase dashboard → **Auth → URL Configuration**:
   - **Site URL**: `https://jiaying8527.github.io/forest-tasks-tracker/`
   - **Redirect URLs** — add each, one per line:
     - `http://localhost:5173/`
     - `http://localhost:5173/#/auth/callback`
     - `https://jiaying8527.github.io/forest-tasks-tracker/`
     - `https://jiaying8527.github.io/forest-tasks-tracker/#/auth/callback`
   Save.
3. (Optional) **Auth → Email Templates → Magic Link** — customize the
   email copy. Default is fine for v1.

Supabase's built-in SMTP covers personal-scale sends (a few per hour)
on the free tier. If you ever hit the rate limit, add a free external
SMTP (e.g., Resend, Postmark) under **Auth → Settings → SMTP**.

---

## Local development

### Prerequisites

- All v1 prerequisites (Node 20.x, npm).
- A copy of `.env.example` at `.env.local`, with real values filled
  in. Do not commit `.env.local`.

```bash
cp .env.example .env.local
# edit .env.local and paste:
#   VITE_SUPABASE_URL=https://ewevafzbsfurirvrovil.supabase.co
#   VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### Run

```bash
npm install           # new dep: @supabase/supabase-js
npm run dev           # same as v1; sign-in button appears in Settings
```

---

## Smoke test (manual, ~4 min)

Do this at a 390 × 844 viewport, in a fresh browser profile (or clear
site data first).

### Part A: signed-out mode still works

1. Open the app at `http://localhost:5173`.
2. **DO NOT** sign in. Add a task, complete it, see the forest.
3. Open DevTools → Network tab. Reload.
4. **Assert**: zero requests to `*.supabase.co`. (SC-005.)
5. Close the tab, reopen — local data persists exactly as before.

### Part B: sign in and sync

1. In Settings, tap **Sign in**.
2. Enter your email address and tap **Send magic link**.
3. Check your email. Click the link. You land back in the app. Settings
   now shows your email and **Synced** in the sync badge.
4. Add a task "Milk".
5. Wait ~2 seconds. DevTools → Network: one `POST` / `PATCH` to
   `…supabase.co/rest/v1/profiles`. Response 200.
6. In the Supabase dashboard → **Database → Tables → profiles**,
   confirm your row's `state.tasks` includes "Milk".

### Part C: cross-device sync

1. Open a second browser profile (or a private window) at the same
   URL.
2. Sign in with the same email address (click the magic-link email
   you receive on that second session).
3. **Assert**: "Milk" is already there.
4. In window B, complete "Milk".
5. **Assert**: within 10 seconds, window A also shows "Milk" as
   completed with a new tree in the forest. (SC-002.)

### Part D: offline edits replay

1. In window A, DevTools → Network → throttle to **Offline**.
2. Add task "Eggs". Complete it. Edit the "Urgent" category name.
3. **Assert**: every action is instant; sync badge shows
   "Offline — will sync when online".
4. Flip throttle back to **No throttling**.
5. **Assert**: within ~10 seconds, sync badge flips back to
   **Synced**, and window B reflects all three changes.

### Part E: sign out wipes the device

1. In window A, Settings → **Sign out** → confirm.
2. **Assert**: the app returns to a clean signed-out state. Tasks
   list is empty. Forest is empty. Settings shows the sign-in
   button again.
3. Reload. **Assert**: still empty + signed-out.
4. Sign back in. **Assert**: all your cloud data returns, including
   forest state.

### Part F: RLS smoke (one-time, in dashboard)

1. Supabase dashboard → **SQL → New query**:

   ```sql
   -- Should return exactly one row (your own).
   SELECT user_id FROM public.profiles;
   ```

   Now impersonate as the anon role:

   ```sql
   SET ROLE anon;
   SELECT user_id FROM public.profiles;
   RESET ROLE;
   ```

2. **Assert**: the second query returns zero rows (anon cannot read
   anything). (SC-004, lightweight version.)

If every Part passes, sync is working.

---

## Common failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sign-in redirects but Settings still shows "Sign in" | Redirect URL mismatch in Supabase Auth → URL Configuration | Ensure both the base URL and the `#/auth/callback` variant are listed for localhost + GitHub Pages |
| Magic-link email never arrives | Address typo, spam filter, or Supabase SMTP rate limit | Check spam folder; use the **Resend email** button (wait 30 s); if sustained, add an external SMTP under Auth → Settings → SMTP |
| "This sign-in link has expired" on first click | Link reused after an email-client prefetch (some mobile clients auto-open links) | Tap **Request a new link** — Supabase magic links are single-use |
| 401 on upsert | Session expired / RLS policy missing | Sign out, sign back in; re-check policies with `SELECT polname FROM pg_policies WHERE tablename = 'profiles'` |
| "permission denied for table profiles" in dashboard queries | `FORCE ROW LEVEL SECURITY` is working as intended | Use `SET ROLE postgres;` in the SQL editor for admin queries |
| Nothing syncs but no errors | `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` missing at build | Check `.env.local`; the app degrades silently to local-only |
| Deploy fails on "service_role" grep | Someone committed a service key | Rotate the key in Supabase dashboard, remove from git history, re-deploy |
