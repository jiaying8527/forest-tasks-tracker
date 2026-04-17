# Forest Tasks Tracker

Mobile-first personal task tracker. All data lives in your browser —
no backend, no login, no cost. Completing a task plants a tree in your
personal forest.

See the full setup and smoke-test recipe in
[specs/001-forest-tasks-tracker/quickstart.md](specs/001-forest-tasks-tracker/quickstart.md).

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173) and resize
to ~390 px width to see the mobile-first layout.

## Cloud sync setup (optional)

Sync is opt-in. The app works fully offline with localStorage. To add
cross-device sync:

1. Copy `.env.example` → `.env.local` and fill in your Supabase project
   URL and **publishable / anon key** (starts with `sb_publishable_`).
2. Apply [supabase/migrations/0001_profiles_rls.sql](supabase/migrations/0001_profiles_rls.sql)
   in your Supabase SQL editor.
3. Enable the **Email** provider in Supabase Auth → Providers with
   Magic Link on, and add your app URLs to Auth → URL Configuration.
4. Full walkthrough: [specs/002-cloud-sync/quickstart.md](specs/002-cloud-sync/quickstart.md).

**Security rule**: only the `VITE_SUPABASE_ANON_KEY` (publishable key)
ever ships in the bundle. A `SUPABASE_SERVICE_ROLE_KEY` bypasses Row
Level Security and MUST NEVER appear in client code, `.env.local`, or
any git-tracked file. CI fails the deploy if `service_role` shows up
in `dist/`.

## Project docs

- [Constitution](.specify/memory/constitution.md) (v2.0.0)
- v1 Local-first build:
  [spec](specs/001-forest-tasks-tracker/spec.md) ·
  [plan](specs/001-forest-tasks-tracker/plan.md) ·
  [tasks](specs/001-forest-tasks-tracker/tasks.md)
- v2 Cloud sync:
  [spec](specs/002-cloud-sync/spec.md) ·
  [plan](specs/002-cloud-sync/plan.md) ·
  [tasks](specs/002-cloud-sync/tasks.md)
