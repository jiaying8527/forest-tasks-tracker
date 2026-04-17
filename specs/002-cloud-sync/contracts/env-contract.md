# Environment Variable Contract

**Feature**: 002-cloud-sync | **Date**: 2026-04-17

Every environment variable that exists in the client-side build is
enumerated here. Introducing a new one requires updating this file.

---

## Allowed in the client bundle

### `VITE_SUPABASE_URL`

- **Value**: The Supabase project URL
  (e.g. `https://ewevafzbsfurirvrovil.supabase.co`).
- **Public?** Yes. Safe to ship in the bundle.
- **Set in**:
  - Local dev: [`.env.local`](../../.env.local) (git-ignored)
  - CI/deploy: GitHub Actions → repo → Settings → Secrets and
    variables → Actions → **Variables** tab (not Secrets) →
    `VITE_SUPABASE_URL`.

### `VITE_SUPABASE_ANON_KEY`

- **Value**: The Supabase *publishable* (a.k.a. *anon*) key. Starts
  with `sb_publishable_…`.
- **Public?** Yes. Designed to be public. Data is protected by RLS.
- **Set in**: same two places as `VITE_SUPABASE_URL`.

---

## Banned from the client bundle

### `SUPABASE_SERVICE_ROLE_KEY`

- **Value**: A server-side admin key. Bypasses RLS.
- **Client policy**: **PROHIBITED.** This key MUST NEVER appear in:
  - Any file starting with `VITE_` (Vite would inline it into the
    bundle).
  - Any file tracked by git (including `.env`, `.env.local`,
    `.env.production`, `.env.example`).
  - Any client-side test file.
  - Any CI job that builds or tests client code.
- **If we ever need it** (e.g. for a two-user RLS CI integration
  test): put it in GitHub Actions **Secrets** (not Variables), and
  use it only in a server-side Node script that does not produce
  client output.

A CI step runs

```sh
grep -r -n --include='*.js' --include='*.css' --include='*.html' \
  --include='*.map' 'service_role' dist/
```

and fails the deploy if any match is found.

---

## `.env.example` (committed)

```env
# Forest Tasks Tracker — cloud sync (feature 002)
# Copy this file to .env.local for local dev.
# See specs/002-cloud-sync/contracts/env-contract.md for the contract.

VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_XXXXXXXXXXXXXXXXXXXXXXXX

# DO NOT put a service_role key in any VITE_* variable or anywhere in
# this repo. That key bypasses Row Level Security and would leak
# everyone's data the moment it shipped to the browser.
```

---

## Bundle-time behavior

- If either variable is missing at build time, the app MUST still
  build successfully. The client detects missing env vars at startup
  and degrades to "local-only" mode silently (no sign-in button
  shown, no network calls). This keeps local-only dev usable without
  a Supabase project.
