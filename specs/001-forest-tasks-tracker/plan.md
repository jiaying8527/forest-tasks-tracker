# Implementation Plan: Forest Tasks Tracker

**Branch**: `001-forest-tasks-tracker` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-forest-tasks-tracker/spec.md`

## Summary

Forest Tasks Tracker is a mobile-first personal task tracker delivered as a
single static web app. Users create, edit, filter, and complete tasks; each
completed task grows a tree in a personal forest view. All data lives in the
browser (localStorage). No backend, no login, zero runtime cost. The
technical approach: a React 18 + Vite PWA, plain CSS with CSS variables for
theming, and an animated SVG forest scene. Deployed to GitHub Pages or
Vercel as a fully static bundle.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20.x (build-time only)
**Primary Dependencies**: React 18, Vite 5, React Router 6 (hash router), nanoid, vite-plugin-pwa
**Storage**: Browser localStorage (primary); IndexedDB planned as fallback only if quota is hit
**Testing**: Vitest (unit) + Playwright (one mobile smoke E2E)
**Target Platform**: Static web app — latest two versions of mobile Safari, mobile Chrome, desktop Chrome/Safari/Firefox
**Project Type**: web (single-project web app, no backend)
**Performance Goals**: First meaningful paint < 2 s on 4G mid-tier mobile; tap-to-feedback < 100 ms; 60 fps forest up to 200 trees
**Constraints**: Core bundle ≤ 250 KB gzipped; fully offline after first load; zero network calls at runtime; no telemetry; WCAG 2.1 AA; `prefers-reduced-motion` honored
**Scale/Scope**: Single user per browser; steady-state ≤ 2,000 tasks; forest aggregation kicks in above ~500 trees

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Mobile-First, Always | ✅ PASS | Layouts designed for 390 px first; bottom-nav pattern; all taps ≥ 44×44. |
| II. Local-Only, Zero-Cost Data | ✅ PASS | localStorage is the sole store; no backend, no auth, no telemetry, no paid deps. Hosted free on GitHub Pages / Vercel. |
| III. Clean, Delightful UI (NON-NEGOTIABLE) | ✅ PASS | Plain CSS with restrained palette + CSS custom properties for theming. Motion reserved for feedback (completion + gentle idle sway). No nag modals, no streak guilt. |
| IV. Forest Rewards Feel Magical, Not Gimmicky | ✅ PASS | Per FR-026, reward animation fires at the moment of completion; the forest view itself is a stable place. Per-tree seed is deterministic from task ID so the forest doesn't re-shuffle. |
| V. Simplicity & Performance | ✅ PASS | Minimal deps (React, Vite, React Router, nanoid, vite-plugin-pwa). No state library. Explicit budgets stated in Technical Context. |

**Post-design re-check (after Phase 1)**: ✅ All principles still pass.
Design artifacts (data-model, storage & export contracts, quickstart)
introduce no new dependencies or server components. Forest aggregation
above ~500 trees is a Principle V / edge-case concession, not a
principle violation.

## Project Structure

### Documentation (this feature)

```text
specs/001-forest-tasks-tracker/
├── plan.md              # This file
├── spec.md
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── storage-schema.md
│   └── export-import-format.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
index.html
vite.config.ts
tsconfig.json
package.json
public/
└── icons/                       # PWA icons, favicon
src/
├── main.tsx                     # App entry (mounts <App />, registers service worker)
├── App.tsx                      # Routes + layout shell
├── routes/
│   ├── TasksActiveRoute.tsx     # Home: active list + filters
│   ├── TasksCompletedRoute.tsx  # Completed list + un-complete
│   ├── ForestRoute.tsx          # Forest scene
│   ├── SettingsRoute.tsx        # Categories, statuses, export/import
│   └── TaskDetailRoute.tsx      # Create / edit a task
├── components/
│   ├── TaskCard.tsx
│   ├── TaskForm.tsx
│   ├── FilterBar.tsx
│   ├── CategoryEditor.tsx
│   ├── StatusEditor.tsx
│   ├── ForestScene.tsx          # SVG canvas
│   ├── Tree.tsx                 # Single animated SVG tree
│   └── BottomNav.tsx
├── state/
│   ├── store.tsx                # Context + useReducer; hydrate/persist
│   ├── reducer.ts               # Pure reducer
│   ├── actions.ts
│   └── selectors.ts             # Filters, due-date buckets, forest derivation
├── storage/
│   ├── localStorage.ts          # Typed read/write with quota-error handling
│   ├── schema.ts                # AppState type + migration map
│   └── seed.ts                  # First-run defaults
├── domain/
│   ├── task.ts
│   ├── category.ts
│   ├── status.ts
│   └── forest.ts                # Tree seed derivation (deterministic per task id)
├── styles/
│   ├── tokens.css               # CSS variables (colors, spacing, radii, motion)
│   ├── base.css                 # Reset + base typography
│   └── components/*.css
└── lib/
    ├── dates.ts                 # Due-date bucketing
    ├── id.ts                    # nanoid wrapper
    └── reducedMotion.ts

tests/
├── unit/
│   ├── reducer.test.ts
│   ├── selectors.test.ts
│   ├── storage.test.ts
│   └── dates.test.ts
└── e2e/
    └── mvp.spec.ts              # Playwright: add → complete → tree appears
```

**Structure Decision**: Single-project web-app layout. No `backend/`
(there is no backend); no native `ios/` / `android/` (mobile story is
a mobile-first web app + PWA install).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

No current violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | (n/a)      | (n/a)                               |
