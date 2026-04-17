# Phase 0 Research: Forest Tasks Tracker

**Feature**: 001-forest-tasks-tracker | **Date**: 2026-04-17

Every NEEDS CLARIFICATION from the Technical Context is resolved below.
Where the spec already made a decision, the entry restates it with
rationale so downstream phases have a single source of truth.

---

## 1. Framework & build tool

**Decision**: React 18 + Vite 5 + TypeScript, no SSR, static build.

**Rationale**:
- User explicitly requested React + Vite.
- Vite's dev server is fast, the static build is small, and its
  `base: './'` config maps cleanly to GitHub Pages / Vercel.
- React 18's concurrent rendering isn't needed, but React is the most
  ergonomic choice for a solo developer, and its ecosystem has the
  widest pool of community knowledge — aligning with Principle V
  (minimal surprise, minimal deps).

**Alternatives considered**:
- **Preact** — smaller runtime (~3 KB), but adds a mental-tax layer of
  React-compat caveats for unclear win given the 250 KB budget is
  already generous. Rejected for day-one simplicity.
- **SolidJS / Svelte** — technically smaller, but user picked React.
- **Next.js** — overkill for a single-user static app; SSR is a
  negative here (we want fully client-side, fully offline).

---

## 2. State management

**Decision**: React `useReducer` + a single `AppContext`. All mutations
go through a pure reducer in `src/state/reducer.ts`. No Redux, Zustand,
Jotai, etc.

**Rationale**:
- Single-user, single-tab app. State is small (tasks, categories,
  statuses, prefs). A reducer + context covers it with zero extra
  dependencies.
- Pure reducer makes unit testing trivial and migrations predictable.
- Aligns with Principle V: don't add a library until pain is real.

**Alternatives considered**:
- Zustand (~1 KB) — fine choice, but still a dep when the problem
  doesn't warrant one.
- TanStack Query — not applicable; there is no server.

---

## 3. Routing

**Decision**: React Router 6 with a **hash router** (`createHashRouter`).

**Rationale**:
- GitHub Pages does not support SPA fallback for deep links on a
  project page without extra hacks; hash routing side-steps this.
- Vercel supports either, but hash routing is the lowest-risk option
  for "deploy anywhere free" per the user's deployment goal.

**Alternatives considered**:
- `BrowserRouter` + Vercel `rewrites` — works but couples the app to a
  specific host config. Rejected to keep the app portable.
- No router (single-screen modals) — rejected; a dedicated Forest
  route, Completed route, and Settings route are clearer IA and cheap
  to add.

---

## 4. Persistence layer

**Decision**: localStorage as the primary store, behind a typed
`storage/localStorage.ts` module with:
1. A single root key `fts.v1` holding the full `AppState` JSON.
2. A version field inside the payload (`"schema": 1`) and a migration
   map so future schema bumps don't require a manual wipe.
3. Quota-error handling: catch `QuotaExceededError`, surface a
   friendly UI error, do not silently drop the edit.

**Rationale**:
- Spec mandates localStorage. It's synchronous, simple, and universally
  supported. For a personal tracker, typical size stays in the low
  hundreds of KB even after years.
- Keeping everything under one key means we read/write a single JSON
  blob — simple, atomic from the user's perspective, trivially
  exportable.

**Alternatives considered**:
- **IndexedDB** — async, per-store, better for large data. Overkill
  for v1; planned only if quota becomes a real problem (spec edge
  case). Flagged as an opt-in v2 upgrade that would sit behind the
  same `storage` module.
- **Multiple localStorage keys** — adds coordination complexity with
  no benefit.

---

## 5. Forest rendering

**Decision**: Inline SVG forest composed of `<Tree />` components, each
deterministically seeded from the completed task's stable ID so species,
position, and scale are stable across reloads.

**Rationale**:
- SVG is resolution-independent, accessible (titles/ARIA), supports
  CSS-driven animation, and has a small rendering cost at our scale.
- Deterministic seeding (`hash(taskId) → species, x, y, scale`) means
  the forest is a *place*, not a re-shuffled board — directly
  supporting Principle IV (magical, not gimmicky).
- For > ~500 trees, switch to stylized clusters (e.g., rendered
  canopies rather than individual SVGs) to preserve 60 fps.

**Alternatives considered**:
- **Canvas 2D** — faster for thousands of elements, but loses per-tree
  DOM semantics (keyboard focus, titles, individual linking). Not
  needed at our scale.
- **WebGL / Three.js** — massive dependency hit, blows the budget,
  overkill for a 2D scene. Rejected.
- **Sprite sheet / PNG atlas** — harder to theme via CSS variables,
  harder to make "organic" variety feel real. Rejected.

---

## 6. Motion & reduced-motion

**Decision**: CSS transitions for the completion reward and a subtle
looped idle sway on trees, gated by a single
`@media (prefers-reduced-motion: reduce)` rule and a user-level
preference override exposed in Settings.

**Rationale**:
- Matches Principle III (motion serves feedback, not decoration) and
  Principle IV (no gimmicks). Idle sway is soft and short; reward
  animation is the single punctuation moment.
- One CSS gate + one user toggle is the simplest path that respects
  accessibility without a motion library.

**Alternatives considered**:
- **Framer Motion** (~50 KB gz) — beautiful API but too large for the
  two places we'd use it. Rejected.
- **Always-on motion** — fails WCAG AA expectations and the
  constitution's reduced-motion commitment. Rejected.

---

## 7. Styling

**Decision**: Plain CSS files, one per component + `styles/tokens.css`
(CSS custom properties for colors, spacing, type scale, radii, motion
durations) + `styles/base.css` (reset, typography, base layout).

**Rationale**:
- User requested plain CSS with CSS variables for theming.
- Keeps the bundle tiny (no CSS-in-JS runtime, no utility generator).
- Theming-by-variables makes a later dark mode a 15-minute change.

**Alternatives considered**:
- **Tailwind** — fast to start but heavier build pipeline and harder
  to hit "calm, uncluttered" per Principle III without discipline.
- **CSS Modules** — fine, but adds a small amount of indirection; not
  worth it at this scale. Component-scoped plain CSS files suffice.

---

## 8. PWA / offline story

**Decision**: Use `vite-plugin-pwa` (Workbox under the hood) with the
default `generateSW` strategy, precaching the built bundle + icons.
No runtime caching plan needed since the app makes no network calls
after load.

**Rationale**:
- Spec requires offline operation after first load (FR-020). A service
  worker is the reliable way to achieve this across browsers.
- `vite-plugin-pwa` adds ~1 KB of app code; Workbox lives in the SW,
  outside the main bundle.
- Install-to-home-screen is a nice-to-have that falls out for free.

**Alternatives considered**:
- **Hand-rolled service worker** — fine but maintenance burden
  outweighs the dependency cost here.
- **No service worker** — fails FR-020 across browser restarts with
  no network.

---

## 9. Testing strategy

**Decision**:
- **Vitest** for unit tests around pure logic (reducer, selectors,
  storage migrations, date bucketing).
- **Playwright** for one smoke E2E at a mobile viewport (390×844)
  that walks US1 + US2: add a task → mark complete → tree appears in
  forest.
- Component-level UI snapshot testing: skipped. Low value for a solo
  personal project; E2E smoke + unit tests on pure logic catch the
  real regressions.

**Rationale**:
- Matches the constitution's development workflow (quality gates) and
  avoids over-testing implementation details.
- Keeps CI fast; Playwright runs a single spec.

**Alternatives considered**:
- **Jest + RTL** — fine, but Vitest integrates with Vite out of the
  box and is faster.
- **Cypress** — heavier and slower than Playwright for one smoke spec.

---

## 10. Deployment target

**Decision**: Primary target **GitHub Pages** (project page), with
Vercel as a fallback. `vite.config.ts` sets `base: './'` so the same
build artifact works on either. A simple GitHub Actions workflow
(`deploy.yml`) builds on push to `main` and publishes to `gh-pages`.

**Rationale**:
- Both are free; GitHub Pages is tied to the repo the user is already
  in, which is zero setup. Vercel is a fallback if the user later
  wants custom domains with zero-config HTTPS.
- Hash routing (Decision 3) makes either host work without rewrite
  rules.

**Alternatives considered**:
- **Netlify / Cloudflare Pages** — equally valid; the chosen two
  cover the user's stated options.

---

## 11. Accessibility targets

**Decision**: WCAG 2.1 AA for contrast, focus order, and keyboard
navigation. Every interactive element reachable via tab; forest scene
exposes per-tree ARIA titles summarizing the source task; reduced
motion supported per Decision 6.

**Rationale**: Constitutional requirement; cheap to get right from
day one, expensive to retrofit.

---

## Summary of decisions

| # | Area | Decision |
|---|------|----------|
| 1 | Framework | React 18 + Vite 5 + TypeScript |
| 2 | State | useReducer + Context, no external store |
| 3 | Routing | React Router 6 hash router |
| 4 | Persistence | localStorage under `fts.v1` with schema versioning |
| 5 | Forest rendering | Inline SVG, deterministic per-task seed |
| 6 | Motion | CSS + reduced-motion gate + user toggle |
| 7 | Styling | Plain CSS + CSS variables in `styles/tokens.css` |
| 8 | PWA / offline | `vite-plugin-pwa` default `generateSW` |
| 9 | Testing | Vitest unit + one Playwright mobile E2E |
| 10 | Deployment | GitHub Pages primary, Vercel fallback |
| 11 | Accessibility | WCAG 2.1 AA, reduced-motion honored |

All NEEDS CLARIFICATION items resolved. Ready for Phase 1.
