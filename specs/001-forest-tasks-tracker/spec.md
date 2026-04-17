# Feature Specification: Forest Tasks Tracker

**Feature Branch**: `001-forest-tasks-tracker`
**Created**: 2026-04-17
**Status**: Draft
**Input**: User description: "Build a personal task tracker web app called Forest Tasks Tracker. Tasks have a title, description (optional), category, status, created-at date (auto-set), due date (optional), and completed-at date (auto-set when marked complete). I can create, edit, and delete categories and statuses. Default categories: Task To Do, Need To Wait, Urgent. Default statuses: New, In Progress, Completed. I can filter tasks by category, status, and due date. Completed tasks disappear from the main list and appear as trees in a beautiful forest scene — the more completed tasks, the denser the forest. Everything is stored in localStorage. Mobile-first web app, no backend, no login, free to host."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture and manage my tasks (Priority: P1)

As a personal user, I want to quickly add a task on my phone, edit it when
details change, and delete it when it's no longer relevant, so that the app
becomes a reliable single place to track my to-dos.

**Why this priority**: Without basic task CRUD the app has no value. This is
the MVP — every other feature assumes tasks already exist.

**Independent Test**: Open the app on a phone-sized viewport, add a task
with a title, open it, edit the title and description, save, then delete it.
Reload the browser and verify the remaining tasks are still there.

**Acceptance Scenarios**:

1. **Given** an empty task list, **When** I tap "Add task" and enter a
   title "Buy groceries", **Then** the task appears at the top of my
   active task list with status "New" and today's date as created-at.
2. **Given** an existing task, **When** I open it and change the title,
   description, category, due date, or status, **Then** the updated
   values are shown after I save and persist across a page reload.
3. **Given** an existing task, **When** I delete it from the task detail
   screen or via a swipe/long-press gesture, **Then** the task is removed
   from the active list and does not reappear after reload.
4. **Given** I have several tasks, **When** I close and reopen the
   browser tab, **Then** all my tasks reappear exactly as I left them.

---

### User Story 2 - Mark a task complete and watch the forest grow (Priority: P1)

As a user, when I finish a task I want to mark it complete and see a small
moment of reward as the forest grows, so that finishing tasks feels
satisfying and motivating over time.

**Why this priority**: The forest reward system is the product's unique
value. Without it this is just another task list. It ships in the MVP
alongside basic CRUD.

**Independent Test**: Create a task, mark it complete, confirm it leaves
the active list, open the forest view, and confirm a new tree has
appeared. Complete more tasks and confirm the forest visibly becomes
denser.

**Acceptance Scenarios**:

1. **Given** a task in any non-completed status, **When** I mark it
   complete, **Then** the task's status becomes "Completed", its
   completed-at date is set to the current date/time automatically, and
   it disappears from the active task list.
2. **Given** I just completed a task, **When** I open the forest view,
   **Then** a new tree is visible in the forest scene with a brief,
   non-intrusive animation that acknowledges the completion.
3. **Given** I have completed 1, 10, and 50 tasks over time, **When** I
   view the forest, **Then** the forest scene is visibly denser as the
   count grows (more trees / more variety), reinforcing sustained
   progress rather than any single action.
4. **Given** I accidentally marked a task complete, **When** I reopen
   the completed task list and un-complete it, **Then** the task returns
   to the active list with its previous (non-completed) status, and its
   corresponding tree is removed from the forest.

---

### User Story 3 - Filter and focus on what matters now (Priority: P2)

As a user with a long list of tasks, I want to filter my active tasks by
category, status, and due date, so that I can focus on what's relevant
today without scrolling through everything.

**Why this priority**: Improves daily usability once a user has enough
tasks to need triage. Not required for the app to function, but essential
for ongoing daily use.

**Independent Test**: Seed the app with ~15 tasks across different
categories, statuses, and due dates. Apply each filter independently and
in combination; confirm the visible list matches the filter criteria.

**Acceptance Scenarios**:

1. **Given** tasks across multiple categories, **When** I filter by
   category "Urgent", **Then** only Urgent tasks are shown.
2. **Given** tasks across multiple statuses, **When** I filter by status
   "In Progress", **Then** only In Progress tasks are shown.
3. **Given** tasks with various due dates, **When** I filter by due
   date "Today", "This week", "Overdue", or "No due date", **Then**
   only tasks matching the chosen date bucket are shown.
4. **Given** I have multiple filters applied, **When** I clear filters,
   **Then** the full active list returns.
5. **Given** I set filters, **When** I reload the browser, **Then** the
   filter state is preserved (see Assumptions).

---

### User Story 4 - Customize my categories and statuses (Priority: P2)

As a user, I want to create, rename, and delete categories and statuses
so the app matches the way I personally organize work, rather than being
forced into the defaults.

**Why this priority**: Personalization makes the app stick for different
types of users (student, freelancer, parent). Defaults cover day one;
customization earns week four.

**Independent Test**: Add a new category "Errands", rename "Urgent" to
"High priority", and delete an unused category. Verify the category
picker in the task form reflects changes and existing tasks in the
renamed/deleted category behave as specified.

**Acceptance Scenarios**:

1. **Given** the default categories, **When** I open category
   management, **Then** I see "Task To Do", "Need To Wait", and "Urgent"
   and can add a new one.
2. **Given** a category or status I created, **When** I rename it,
   **Then** every task using it reflects the new name immediately.
3. **Given** a category or status that is still in use, **When** I try
   to delete it, **Then** the app explains that tasks will be reassigned
   to a chosen fallback (e.g., "Task To Do" for category, "New" for
   status) and asks me to confirm before deleting.
4. **Given** default entries, **When** I attempt to delete a default
   category or status, **Then** the app allows deletion only after
   reassigning its tasks (same flow as above) — no defaults are
   protected from deletion beyond this safeguard.

---

### User Story 5 - Export and restore my data (Priority: P3)

As a user whose data lives only in the browser, I want to export my
tasks and forest state to a file and re-import it, so that I can back up
my data or move it between devices/browsers.

**Why this priority**: Not required for first use but critical for user
trust over time — local-only storage is fragile without an export.

**Independent Test**: Create several tasks and complete a few. Export
the data to a JSON file. Clear browser storage (simulating a new device
or lost data). Import the JSON file and verify all tasks, categories,
statuses, and forest state are restored.

**Acceptance Scenarios**:

1. **Given** tasks and a grown forest, **When** I trigger "Export my
   data", **Then** a JSON file is downloaded containing all tasks,
   categories, statuses, and forest-state data.
2. **Given** an exported JSON file, **When** I trigger "Import" and
   select the file, **Then** the app restores the data and warns me
   before overwriting any existing data.
3. **Given** a corrupt or incompatible import file, **When** I try to
   import, **Then** the app rejects the file with a clear error and
   does not modify my current data.

---

### Edge Cases

- **Storage full**: Browser local storage quota exceeded when saving a
  task → the app surfaces a friendly error and suggests exporting data
  or deleting completed tasks; current edit is not silently lost.
- **Clearing browser data**: User clears site data → all tasks and
  forest state are gone. The app states this clearly in an onboarding
  hint and via the export feature (US5).
- **Time zones / device clock changes**: Created-at and completed-at
  are captured in the user's local time at the moment of the action;
  filtering "Today" uses the user's current device date at view time.
- **Due date in the past when creating**: Allowed — the app does not
  block past due dates; the task is simply marked "overdue" visually.
- **Deleting the last category or status**: Prevented — the app MUST
  keep at least one category and one status to remain usable.
- **Task with no category or status assigned**: Not possible — every
  task MUST always have exactly one category and one status. New tasks
  default to "Task To Do" and "New" unless the user picks otherwise.
- **Reduced-motion preference**: The forest reward animation MUST have
  a calm, static alternative for users who have reduced-motion enabled.
- **Very large forests** (e.g., 1000+ completed tasks): The forest
  scene MUST remain performant; it may aggregate or stylize trees at
  high counts rather than rendering each individually.

## Requirements *(mandatory)*

### Functional Requirements

**Task CRUD and fields**
- **FR-001**: System MUST allow the user to create a task with at
  minimum a title. All other fields are optional on create.
- **FR-002**: Each task MUST store: title (required), description
  (optional, free text), category (required, exactly one), status
  (required, exactly one), created-at date/time (auto-set on create,
  immutable), due date (optional, date only), completed-at date/time
  (auto-set when status becomes "Completed", cleared when un-completed).
- **FR-003**: Users MUST be able to edit any editable task field at
  any time and the change MUST persist immediately.
- **FR-004**: Users MUST be able to delete a task, with a brief undo
  affordance (e.g., "Task deleted — Undo") to recover from mistakes.

**Defaults and customization**
- **FR-005**: On first run, the system MUST seed categories "Task To
  Do", "Need To Wait", "Urgent" and statuses "New", "In Progress",
  "Completed".
- **FR-006**: Users MUST be able to create, rename, and delete
  categories and statuses.
- **FR-007**: When a category or status is deleted while tasks still
  use it, the system MUST prompt the user to choose a fallback and
  reassign those tasks before deletion.
- **FR-008**: The system MUST always retain at least one category and
  at least one status.
- **FR-009**: The system MUST always have exactly one status
  designated as the "completed" status so the forest/completion
  behavior is unambiguous. By default this is "Completed". If the user
  renames or deletes it, they MUST designate another status as the
  completed status before the change is accepted.

**Filtering and views**
- **FR-010**: The main list MUST show only active (non-completed)
  tasks by default.
- **FR-011**: Users MUST be able to filter the active list by
  category, by status, and by due date bucket ("Today", "This week",
  "Overdue", "No due date"). Filters MUST be combinable.
- **FR-012**: Users MUST be able to view a separate "Completed" list
  showing completed tasks with their completed-at date.
- **FR-013**: Users MUST be able to re-open (un-complete) a completed
  task, which removes it from the completed list, restores it to the
  active list with its prior non-completed status, and removes the
  corresponding tree from the forest.

**Forest reward system**
- **FR-014**: The system MUST provide a forest view in which each
  completed task corresponds to exactly one tree.
- **FR-015**: The forest MUST feel visibly denser as the cumulative
  completed-task count grows, reinforcing sustained progress.
- **FR-016**: Completing a task MUST trigger a brief, non-intrusive
  feedback moment (subtle animation or visual acknowledgement) that
  respects reduced-motion preferences.
- **FR-017**: The forest MUST NOT use manipulative gamification: no
  streak-loss threats, no nag notifications, no randomized/gacha
  rewards, no artificial scarcity, no points-for-points counters.
- **FR-018**: Tree variety (species, position, subtle differences)
  SHOULD feel organic rather than templated, so the forest looks like
  a place rather than a progress bar.

**Persistence and portability**
- **FR-019**: All user data (tasks, categories, statuses, forest
  state, preferences) MUST persist locally in the browser and survive
  a page reload and browser restart.
- **FR-020**: The system MUST function fully offline after the first
  load.
- **FR-021**: Users MUST be able to export all their data to a single
  file and import it back, overwriting current data only after explicit
  confirmation.
- **FR-022**: The system MUST NOT send user task content to any
  server or third party.

**Platform and access**
- **FR-023**: The app MUST be usable on mobile viewports (≤ 390 px
  wide) with touch-friendly targets and one-handed reachability.
- **FR-024**: The app MUST NOT require account creation, login, or
  any form of authentication.
- **FR-025**: The app MUST be deployable as a static site to a free
  static host, with no runtime server required.

**Forest reward timing**
- **FR-026**: The moment-of-reward animation MUST occur at the point of
  completion (when the user taps "complete"), not on subsequent views of
  the forest. Trees earned while the forest view was closed MUST appear
  as already-planted on the next visit, with no grow-in animation.
  Rationale: reinforces a stable sense of place over a slot-machine feel
  and keeps the forest honoring Principle IV (magical, not gimmicky).

### Key Entities

- **Task**: A single to-do item. Attributes: title, description,
  category (reference), status (reference), created-at timestamp, due
  date (optional), completed-at timestamp (optional), and a stable
  identifier for referencing from the forest.
- **Category**: A user-owned label for grouping tasks. Attributes:
  name, optional ordering, and a "default / non-default" flag for
  seeding. One-to-many with tasks.
- **Status**: A lifecycle state for a task. Attributes: name,
  ordering, and an "is completed status" flag (exactly one status has
  this flag set).
- **ForestState**: The derived/persisted view of the forest scene.
  Attributes: a collection of Tree entries, each linked to the
  completed Task that produced it, plus any cached per-tree visual
  seed (species, position) so the forest looks stable across reloads
  rather than re-shuffling.
- **Preferences**: User-level settings (e.g., last-used filter,
  reduced-motion override, export timestamp).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user on a mobile browser can add their
  first task within 30 seconds of opening the app, with no onboarding
  required.
- **SC-002**: Completing a task and seeing the forest acknowledge it
  takes no more than 2 interactions (1 tap to complete, optionally 1
  tap to view the forest).
- **SC-003**: 95% of core interactions (add task, edit task, toggle
  complete, open forest) feel instant to the user — acknowledged
  visibly within 100 ms of tap.
- **SC-004**: After one week of typical personal use (≈ 20–40
  completed tasks), users can describe the forest reward as "nice" or
  "motivating" rather than "annoying" or "nagging" in informal
  feedback.
- **SC-005**: A user can back up and restore their full data set in
  under 60 seconds using the export/import flow.
- **SC-006**: Running cost of hosting and operating the app is $0.

## Assumptions

- **Single user per browser**: No multi-user or shared-list support
  in scope. Data is personal and device-bound unless exported.
- **English copy for v1**: All UI copy ships in English; localization
  is out of scope.
- **Filter persistence**: Filters DO persist across reloads — a
  returning user sees what they were last focused on. A "Clear
  filters" control is always one tap away.
- **Date-only due dates**: Due dates are dates, not date+time. Time-
  of-day reminders are out of scope for v1 (no notifications either,
  consistent with the "no nagging" principle).
- **Un-completing a task removes its tree**: This keeps tree count
  and completed-task count consistent and avoids rewarding false
  progress.
- **No public sharing / social feed**: The forest is personal and not
  shared or posted, consistent with the "no backend, no nagging"
  stance.
- **Browser support**: Latest two major versions of mobile Safari,
  mobile Chrome, and desktop Chrome/Safari/Firefox — matches the
  constitution's platform constraints.
- **Storage ceiling**: Local browser storage is expected to
  comfortably hold a personal user's tasks for years. If quota is
  ever hit, the app warns and suggests export + prune of completed
  tasks.
- **Time handling**: All timestamps are captured and displayed in
  the device's local time; no server clock or time-zone conversion.
