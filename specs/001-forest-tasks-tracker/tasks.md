---

description: "Task list for Forest Tasks Tracker implementation"
---

# Tasks: Forest Tasks Tracker

**Input**: Design documents from `/specs/001-forest-tasks-tracker/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Vitest unit tests for pure logic (reducer, selectors, storage, dates) and one Playwright mobile smoke E2E (US1+US2) are included — they are part of the plan's testing strategy, not optional polish.

**Organization**: Tasks are grouped by user story (from [spec.md](./spec.md)) so each can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task serves (US1–US5)
- All paths are relative to the repo root

## Path Conventions

Single-project web app (per [plan.md](./plan.md)):

- Source: `src/`
- Tests: `tests/unit/`, `tests/e2e/`
- Static assets: `public/`
- Build / config: repo root (`index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the Vite + React + TypeScript project so any user story can start.

- [X] T001 Create base project files at repo root: `package.json`, `tsconfig.json`, `.gitignore`, `.editorconfig`, and a minimal `README.md` that points at [specs/001-forest-tasks-tracker/quickstart.md](./quickstart.md)
- [X] T002 Initialize Vite + React + TypeScript scaffolding: add `index.html`, `vite.config.ts` (set `base: './'` for GitHub Pages), `src/main.tsx`, `src/App.tsx`, and an empty `public/` directory
- [X] T003 Install runtime dependencies in `package.json` and lock them: `react@18`, `react-dom@18`, `react-router-dom@6`, `nanoid`
- [X] T004 Install dev dependencies in `package.json`: `typescript@5`, `@types/react`, `@types/react-dom`, `vite@5`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`
- [X] T005 [P] Configure ESLint + Prettier at repo root (`.eslintrc.cjs`, `.prettierrc`, add `lint` and `format` scripts to `package.json`)
- [X] T006 [P] Configure Vitest in `vite.config.ts` (jsdom environment, `tests/unit/**/*.test.ts` pattern) and add `test` + `typecheck` scripts to `package.json`
- [X] T007 [P] Configure Playwright in `playwright.config.ts` at repo root (mobile viewport 390×844, base URL `http://localhost:4173`, one project) and add `test:e2e` script to `package.json`
- [X] T008 [P] Add PWA config to `vite.config.ts` via `vite-plugin-pwa` (generateSW, precache built bundle + `public/icons/*`, app name "Forest Tasks Tracker")
- [X] T009 [P] Create base styles in `src/styles/tokens.css` (CSS variables for color, spacing, radii, type scale, motion durations) and `src/styles/base.css` (reset + typography); import both from `src/main.tsx`
- [X] T010 [P] Add GitHub Actions deploy workflow at `.github/workflows/deploy.yml` (build on push to `main`, publish `dist/` to `gh-pages` branch) per [quickstart.md](./quickstart.md)

**Checkpoint**: `npm run dev` serves a blank but structured app at 390 px width; `npm run build`, `npm run test`, and `npm run test:e2e` all succeed with zero tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain types, persistence, state store, app shell, and first-run seed. No user story can start until this phase is complete.

**⚠️ CRITICAL**: Every user story below depends on this phase.

- [X] T011 Define domain types in `src/domain/task.ts`, `src/domain/category.ts`, `src/domain/status.ts`, `src/domain/forest.ts` matching [data-model.md](./data-model.md) (Task, Category, Status, Tree, Preferences)
- [X] T012 Define the root `AppState` type and schema version constant in `src/storage/schema.ts` per [contracts/storage-schema.md](./contracts/storage-schema.md) (`schema: 1`)
- [X] T013 Implement the first-run seed in `src/storage/seed.ts`: default categories (Task To Do / Need To Wait / Urgent) and statuses (New / In Progress / Completed with `isCompleted: true`) with stable IDs per [contracts/storage-schema.md](./contracts/storage-schema.md)
- [X] T014 Implement the storage module in `src/storage/localStorage.ts`: typed `loadState()` / `saveState()` under key `fts.v1`, `QuotaExceededError` → typed `StorageQuotaError`, migration map stub, refuse-to-load for newer schemas
- [X] T015 [P] Unit tests in `tests/unit/storage.test.ts` covering: first-run seed shape, round-trip save/load, schema-newer-than-build rejection, `StorageQuotaError` surfacing
- [X] T016 [P] Implement `src/lib/id.ts` (nanoid wrapper, 12-char default) and `src/lib/reducedMotion.ts` (reads `prefers-reduced-motion` + user override from `prefs.reducedMotion`)
- [X] T017 [P] Implement `src/lib/dates.ts` with pure due-date bucketing (`today` / `thisWeek` / `overdue` / `none`) per [data-model.md](./data-model.md); unit tests in `tests/unit/dates.test.ts` covering all buckets and boundary days
- [X] T018 Implement the pure reducer in `src/state/reducer.ts`, the action creators in `src/state/actions.ts`, and export action types — actions: `addTask`, `updateTask`, `deleteTask`, `completeTask`, `uncompleteTask`, `addCategory`, `renameCategory`, `deleteCategory` (with `reassignTo`), `addStatus`, `renameStatus`, `deleteStatus` (with `reassignTo`), `setCompletedStatus`, `setFilters`, `setReducedMotion`, `replaceState` (for import)
- [X] T019 Write the core selectors in `src/state/selectors.ts`: `activeTasks`, `completedTasks`, `applyFilters(state, filters)`, `forestTrees`, `completedStatus(state)`
- [X] T020 Unit tests in `tests/unit/reducer.test.ts` covering every action above, including: invariants (≥1 category, ≥1 status, exactly one `isCompleted` status), `completeTask` writes `completedAt` + plants a Tree, `uncompleteTask` restores `priorStatusId` and removes the Tree, referential integrity on category/status delete with `reassignTo`
- [X] T021 Unit tests in `tests/unit/selectors.test.ts` covering active/completed partitioning, combined filter application (category × status × due bucket), and forest derivation from completed tasks
- [X] T022 Implement the store + hydration boundary in `src/state/store.tsx`: React context, `useReducer` over the pure reducer, load on mount (seed if absent), persist on every change via `src/storage/localStorage.ts`, expose `useAppState()` and `useAppDispatch()` hooks
- [X] T023 Build the app shell in `src/App.tsx`: wire `createHashRouter` (React Router 6) with routes for `/tasks`, `/completed`, `/forest`, `/settings`, `/task/:id`; render a shared `<Layout>` with `<Outlet />` and `src/components/BottomNav.tsx`
- [X] T024 Implement `src/components/BottomNav.tsx` (Tasks / Forest / Settings), thumb-reachable, ≥ 44×44 px taps, active-route highlighting; component CSS at `src/styles/components/BottomNav.css`

**Checkpoint**: App boots at 390 px; first-run seeds defaults visible via devtools; bottom nav switches between empty route shells; every reducer action verified in isolation; `npm run test` is green.

---

## Phase 3: User Story 1 - Capture and manage my tasks (Priority: P1) 🎯 MVP

**Goal**: Users can add, view, edit, and delete tasks on a mobile viewport, and tasks persist across reloads.

**Independent Test**: At 390×844, add a task "Buy groceries"; reload; edit title + description + category + due date; delete via swipe/long-press; reload and confirm the delete stuck.

### Implementation for User Story 1

- [X] T025 [P] [US1] Implement `src/components/TaskCard.tsx` (title, due-date pill, category chip, completion toggle slot) + `src/styles/components/TaskCard.css`
- [X] T026 [P] [US1] Implement `src/components/TaskForm.tsx` (title required/trimmed 1–200, description 0–5000, category picker, status picker, due-date input, submit/cancel) + `src/styles/components/TaskForm.css`
- [X] T027 [US1] Implement `src/routes/TasksActiveRoute.tsx`: render `useSelector(activeTasks)` as a list of `<TaskCard>`, empty-state copy, floating "Add task" button that routes to `/task/new`
- [X] T028 [US1] Implement `src/routes/TaskDetailRoute.tsx`: `new` mode creates via `addTask`, existing `:id` mode loads the task and dispatches `updateTask` on save; delete action with undo toast (window: 5 s) that dispatches a restore action if tapped
- [X] T029 [US1] Wire swipe / long-press delete on `src/components/TaskCard.tsx` with the same undo affordance as T028

**Checkpoint**: User Story 1 is fully functional: add / view / edit / delete tasks end-to-end on mobile, persisted across reload.

---

## Phase 4: User Story 2 - Mark a task complete and watch the forest grow (Priority: P1) 🎯 MVP

**Goal**: Marking a task complete removes it from the active list, fires a single subtle reward animation at completion time, and plants one tree in a stable forest scene.

**Independent Test**: Complete a task — reward animation plays once at completion; open the forest and see exactly one tree; complete more tasks and confirm the forest visibly densifies; un-complete a task and confirm the corresponding tree disappears.

### Implementation for User Story 2

- [X] T030 [P] [US2] Implement deterministic tree-seed derivation in `src/domain/forest.ts` (`seedForTaskId(taskId) → { speciesIndex, x, y, scale }`) so each completed task's tree position and species are stable across reloads
- [X] T031 [P] [US2] Implement `src/components/Tree.tsx` (SVG tree shape with 3–5 species variants, CSS idle sway keyframes gated by `src/lib/reducedMotion.ts`) + `src/styles/components/Tree.css`
- [X] T032 [US2] Implement `src/components/ForestScene.tsx` (`<svg viewBox>` canvas sized to viewport, iterates `forestTrees` selector, renders one `<Tree>` per entry with ARIA title summarizing the source task) + `src/styles/components/ForestScene.css`; apply canopy-density tiers by tree count (1–10 / 11–50 / 51–200 / 200+)
- [X] T033 [US2] Implement `src/routes/ForestRoute.tsx` (header copy, `<ForestScene>`, stable — no grow-in animation per [spec.md](./spec.md) FR-026)
- [X] T034 [US2] Wire the completion action on `src/components/TaskCard.tsx` to dispatch `completeTask`; trigger the single moment-of-completion animation (subtle checkmark + soft tree-popup hint on the card) and then remove the card — animation gated by `prefers-reduced-motion` / user override
- [X] T035 [US2] Implement `src/routes/TasksCompletedRoute.tsx` listing `completedTasks` selector (sorted by `completedAt DESC`), each row has an "Un-complete" action dispatching `uncompleteTask` which restores `priorStatusId` and removes the corresponding Tree
- [X] T036 [US2] Add aggregation fallback in `src/components/ForestScene.tsx`: above 500 trees, render stylized canopy clusters instead of individual `<Tree>` components (per [data-model.md](./data-model.md) Derived Views)
- [X] T037 [US2] Playwright smoke E2E in `tests/e2e/mvp.spec.ts` at viewport 390×844: cold localStorage → add task "Buy groceries" → complete → navigate to Forest → assert exactly 1 `<svg>` tree present → un-complete → assert 0 trees

**Checkpoint**: MVP complete. User Stories 1 + 2 together deliver the product's core promise. Matches the quickstart smoke test in [quickstart.md](./quickstart.md).

---

## Phase 5: User Story 3 - Filter and focus on what matters now (Priority: P2)

**Goal**: Users can filter the active list by category, status, and due-date bucket; filters combine; selected filters persist across reloads.

**Independent Test**: Seed ~15 tasks; apply category = Urgent → only Urgent shows; combine with due = Overdue → intersection shows; clear filters → full list returns; reload → last filters restored.

### Implementation for User Story 3

- [X] T038 [P] [US3] Implement `src/components/FilterBar.tsx` (category select, status select, due-bucket chips for Today / This week / Overdue / No due date, "Clear filters" button) + `src/styles/components/FilterBar.css`
- [X] T039 [US3] Wire `FilterBar` into `src/routes/TasksActiveRoute.tsx`: dispatch `setFilters` on change, read `prefs.lastFilters` on mount, apply via `applyFilters` selector
- [X] T040 [US3] Unit tests in `tests/unit/selectors.test.ts` (append): combined filter scenarios (category × status, category × due bucket, all three) and `none` bucket semantics

**Checkpoint**: Filtering and filter persistence work end-to-end, independent of US4 / US5.

---

## Phase 6: User Story 4 - Customize my categories and statuses (Priority: P2)

**Goal**: Users can create, rename, and delete categories and statuses; deletion-in-use prompts for a reassignment target; the sole completed status is protected by a designation step.

**Independent Test**: In Settings → Categories, add "Errands"; rename "Urgent" → "High priority" and confirm existing tasks reflect the rename immediately; attempt to delete "Need To Wait" while tasks reference it → reassignment prompt blocks the delete until a target is chosen. Same flow for Statuses, plus confirm the completed-status designation cannot be dropped without naming a replacement.

### Implementation for User Story 4

- [X] T041 [P] [US4] Implement `src/components/CategoryEditor.tsx` (list + add + rename + delete with inline "Reassign tasks to …" picker) + `src/styles/components/CategoryEditor.css`
- [X] T042 [P] [US4] Implement `src/components/StatusEditor.tsx` (same shape as CategoryEditor, plus a "Mark as completed status" toggle with a "designate replacement" flow when turning the current completed status off) + `src/styles/components/StatusEditor.css`
- [X] T043 [US4] Implement `src/routes/SettingsRoute.tsx` mounting both editors and exposing Export/Import slots for US5
- [X] T044 [US4] Unit tests in `tests/unit/reducer.test.ts` (append): deleting an in-use category rejects without `reassignTo`, rejects when result would leave zero categories, and reassigns dependent tasks atomically on success; equivalent coverage for status delete and for `setCompletedStatus`

**Checkpoint**: Categories and statuses can be customized without breaking any task's referential integrity; the sole-completed-status invariant is enforced.

---

## Phase 7: User Story 5 - Export and restore my data (Priority: P3)

**Goal**: Users can download a full JSON snapshot and later import it, with validation and explicit destructive-action confirmation.

**Independent Test**: Create several tasks, complete a few, export JSON; clear site data; import JSON; confirm tasks, categories, statuses, and forest state are restored verbatim (including tree positions).

### Implementation for User Story 5

- [X] T045 [P] [US5] Implement `src/lib/exportImport.ts` with `exportState(state) → Blob` and `validateImport(json) → Result<AppState, ImportError>` per [contracts/export-import-format.md](./contracts/export-import-format.md) — pure, no side effects, full referential-integrity check
- [X] T046 [US5] Wire Export button in `src/routes/SettingsRoute.tsx` to download `forest-tasks-tracker-YYYY-MM-DD.json` and stamp `prefs.lastExportAt`
- [X] T047 [US5] Wire Import in `src/routes/SettingsRoute.tsx`: file picker → `validateImport` → destructive confirmation modal → dispatch `replaceState` → success toast with entity counts
- [X] T048 [US5] Unit tests in `tests/unit/exportImport.test.ts` covering: happy-path round-trip, rejects wrong `app` tag, rejects schema-newer-than-build, rejects referential-integrity violations (orphan task/category/status, zero or multiple `isCompleted` statuses, orphan tree), and verifies original state is untouched on rejection

**Checkpoint**: Users can back up and restore their full data set per [spec.md](./spec.md) SC-005.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, quota-error UX, reduced-motion toggle, onboarding hint, PWA icons, deployment verification.

- [X] T049 [P] Accessibility pass: keyboard nav across all routes, focus-visible styles in `src/styles/base.css`, ARIA labels on `BottomNav`, `TaskCard` actions, and Forest trees; verify WCAG AA contrast in `src/styles/tokens.css` via DevTools
- [X] T050 [P] Quota-error UX: surface `StorageQuotaError` from `src/storage/localStorage.ts` as a friendly toast ("Your device is out of space — export data or remove completed tasks") without silently losing the in-progress edit; wire into save paths in `src/state/store.tsx`
- [X] T051 [P] Reduced-motion toggle UI in `src/routes/SettingsRoute.tsx` (system / always / never) bound to `prefs.reducedMotion`; integrates with `src/lib/reducedMotion.ts`
- [X] T052 [P] First-run onboarding hint on `src/routes/TasksActiveRoute.tsx` stating "Your tasks live in this browser only — export from Settings to back them up"; dismissable, stored in `prefs`
- [X] T053 [P] Add PWA icons in `public/icons/` (192, 512, maskable) and favicon in `public/`; reference from `vite.config.ts` PWA config
- [X] T054 Performance verification against [plan.md](./plan.md) budgets: `npm run build` — assert core bundle ≤ 250 KB gzipped (record in PR); manually verify first meaningful paint < 2 s on throttled "Slow 4G" and tap-to-feedback < 100 ms on mid-tier mobile
- [X] T055 Walk the full [quickstart.md](./quickstart.md) smoke test on a real mobile browser (or emulated 390×844) and fix any gaps; confirm deployment workflow in `.github/workflows/deploy.yml` produces a working `gh-pages` preview

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories
- **User Story 1 (Phase 3, P1)**: Depends on Foundational
- **User Story 2 (Phase 4, P1)**: Depends on Foundational; independent of US1 in code but shares the TaskCard component; if both developers work in parallel, coordinate T025 + T034
- **User Story 3 (Phase 5, P2)**: Depends on Foundational + US1 (needs the active list to filter)
- **User Story 4 (Phase 6, P2)**: Depends on Foundational only
- **User Story 5 (Phase 7, P3)**: Depends on Foundational only (acts on AppState; reuses `replaceState` from T018)
- **Polish (Phase 8)**: Depends on all user stories you intend to ship

### Within Each User Story

- Components [P] within a story can go in parallel (different files)
- Route wiring depends on its components
- Tests extending an existing test file are sequential w.r.t. that file

### Parallel Opportunities

- All of Phase 1 after T004 is [P]-heavy (T005–T010)
- Phase 2: T015, T016, T017 are [P] after T014 and T011; T020/T021 require T018/T019
- US1 components T025/T026 in parallel; US2 T030/T031 in parallel; US4 T041/T042 in parallel
- Polish T049–T053 are all [P]

---

## Parallel Example: User Story 1

```bash
# Both components can go in parallel once Phase 2 is done:
Task: "T025 [P] [US1] Implement src/components/TaskCard.tsx + TaskCard.css"
Task: "T026 [P] [US1] Implement src/components/TaskForm.tsx + TaskForm.css"

# Then wire routes sequentially (they import both):
Task: "T027 [US1] Implement src/routes/TasksActiveRoute.tsx"
Task: "T028 [US1] Implement src/routes/TaskDetailRoute.tsx"
Task: "T029 [US1] Swipe/long-press delete on TaskCard"
```

---

## Implementation Strategy

### MVP first (User Stories 1 + 2 only)

1. Phase 1: Setup (T001–T010)
2. Phase 2: Foundational (T011–T024)
3. Phase 3 + Phase 4: US1 + US2 (T025–T037)
4. **STOP AND VALIDATE**: Walk [quickstart.md](./quickstart.md) smoke test
5. Deploy preview via `.github/workflows/deploy.yml`

### Incremental delivery after MVP

- Add US3 (filters, T038–T040) → deploy
- Add US4 (customization, T041–T044) → deploy
- Add US5 (export/import, T045–T048) → deploy
- Close out with Polish phase (T049–T055)

### Notes

- [P] = different file, no dependency on an incomplete task
- Commit after each task or logical group (matches the `after_*` git hooks in [.specify/extensions.yml](../../.specify/extensions.yml))
- Stop at any Checkpoint to validate the story before moving on
- Never weaken a Principle I–V commitment without a constitution amendment
