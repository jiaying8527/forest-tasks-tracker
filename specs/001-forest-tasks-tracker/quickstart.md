# Quickstart: Forest Tasks Tracker

**Feature**: 001-forest-tasks-tracker | **Date**: 2026-04-17

A short recipe to bring the app up locally and know it's working.

---

## Prerequisites

- Node.js 20.x (or later LTS)
- A package manager: npm (bundled) or pnpm
- Git

---

## First-time setup

```bash
# from the repo root
npm install
npm run dev
```

`npm run dev` starts Vite at http://localhost:5173. Open it on a
desktop browser first, then resize to ~390 px wide (or use device
toolbar) to verify the mobile-first layout.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production static build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run Playwright smoke E2E (`tests/e2e/mvp.spec.ts`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (if configured) |

---

## Smoke test (manual, ~90 seconds)

Matches the User Story 1 + 2 Independent Tests in the spec. Do this at
390 × 844 mobile viewport.

1. Open the app at a clean localStorage (DevTools → Application → Storage → Clear site data → reload).
2. First-run: the three default categories and three default statuses seed automatically. Verify by opening **Settings → Categories** and **Settings → Statuses**.
3. Tap **Add task**. Enter title "Buy groceries". Save.
4. Confirm the task appears at the top of the active list with status "New".
5. Reload the page. Confirm the task persists.
6. Tap the task → change category to "Urgent" → save. Confirm the change sticks after reload.
7. Tap **Complete** on the task.
   - The task leaves the active list.
   - A brief reward animation plays at the completion point.
8. Navigate to **Forest**. Confirm exactly one tree is present.
9. Navigate to **Completed**. Tap the task → **Un-complete**.
   - Task returns to the active list with its prior status.
   - The tree is gone from the forest.
10. Open DevTools → Application → Local Storage. Confirm a single key
    `fts.v1` holds a JSON object matching
    [contracts/storage-schema.md](./contracts/storage-schema.md).

If any step fails, the MVP is not done.

---

## Mobile verification checklist (pre-commit for UI-affecting changes)

- [ ] Layout checked at 390 × 844.
- [ ] All taps have at least 44×44 px target.
- [ ] Primary action reachable with thumb in one-handed use.
- [ ] Motion respects `prefers-reduced-motion` (flip OS setting → animation calms).
- [ ] No horizontal scroll at mobile width.
- [ ] Color contrast passes WCAG AA (spot-check with DevTools).

---

## Deploying (free)

### GitHub Pages (default)

```bash
npm run build
# commit & push — a GitHub Actions workflow (deploy.yml) publishes dist/ to the gh-pages branch
```

The site will be live at `https://<user>.github.io/forest-tasks-tracker/`.
`vite.config.ts` sets `base: './'` so relative asset URLs work there.

### Vercel (fallback)

1. Import the repo at vercel.com.
2. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
3. No environment variables; no backend.

Both hosts serve the static bundle only. Hash routing (`/#/tasks`,
`/#/forest`, etc.) means SPA fallback is not required.

---

## Troubleshooting

- **"Your device is out of space" toast**: localStorage quota exceeded.
  Export data from **Settings → Export**, then delete some completed
  tasks.
- **Data disappeared after clearing browser data**: That's expected
  and spelled out in the onboarding hint. Use **Settings → Export**
  periodically if this matters.
- **"This build is older than your data"**: The stored `schema` is
  newer than this build understands. Deploy the latest build or wait
  for a newer release before trying again.
