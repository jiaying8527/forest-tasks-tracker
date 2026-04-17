# Phase 1 Data Model: Forest Tasks Tracker

**Feature**: 001-forest-tasks-tracker | **Date**: 2026-04-17

This describes the logical data model. The physical persistence format
is documented in [contracts/storage-schema.md](./contracts/storage-schema.md).

All timestamps are ISO-8601 strings captured in the user's local time
(no timezone conversion; see Assumptions in the spec).

---

## Entities

### Task

A single to-do item.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` (nanoid, 12 chars) | yes | Stable, globally unique, referenced by Tree. Immutable. |
| `title` | `string` | yes | Trimmed; 1–200 chars. |
| `description` | `string` | no | Free text; 0–5,000 chars. |
| `categoryId` | `string` (Category.id) | yes | Must reference an existing Category. |
| `statusId` | `string` (Status.id) | yes | Must reference an existing Status. |
| `createdAt` | `string` (ISO-8601) | yes | Auto-set on create. Immutable. |
| `dueDate` | `string` (`YYYY-MM-DD`) | no | Date only, no time. |
| `completedAt` | `string` (ISO-8601) | no | Auto-set when `statusId` becomes the completed status; cleared when un-completed. |
| `priorStatusId` | `string` (Status.id) | no | The last non-completed status; used to restore on un-complete. |

**Invariants**:
- `categoryId` and `statusId` always resolve to live entities. Deletion of
  a Category or Status reassigns all dependent Tasks first (FR-007).
- `completedAt` is non-null iff `statusId` is the completed Status.
- `title` is always non-empty after trim; empty-title submits are rejected
  at the form level.

**State transitions**:

```text
                 user edits status
┌──────────┐ ──────────────────────► ┌───────────────┐
│ Active   │                         │ Completed     │
│ (statusId│ ◄────────────────────── │ (statusId =   │
│  ≠ done) │   user un-completes     │  done status) │
└──────────┘                         └───────────────┘
   │                                        │
   │                                        │
   ▼                                        ▼
 delete                                   delete
 (drops task; also drops Tree if present)
```

- **On transition → completed**: set `completedAt = now`, remember
  `priorStatusId = <old statusId>`, append a Tree keyed by `taskId`.
- **On transition ← completed (un-complete)**: restore
  `statusId = priorStatusId ?? default "New" equivalent`, clear
  `completedAt`, remove the Tree with that `taskId`.

---

### Category

A user-owned label for grouping tasks.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` (nanoid) | yes | Immutable. |
| `name` | `string` | yes | Trimmed; 1–40 chars; unique across categories (case-insensitive). |
| `order` | `number` | yes | Stable display order. |
| `isSeeded` | `boolean` | yes | True for the three defaults ("Task To Do", "Need To Wait", "Urgent") to preserve their original identity through renames. |

**Invariants**:
- At least one Category MUST exist at all times (FR-008).
- Deleting a Category in use requires a reassignment target (FR-007).
- Defaults are *not* protected from deletion — only from being the *last*
  remaining category (FR-008 + US4 scenario 4).

---

### Status

A lifecycle state for a task.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` (nanoid) | yes | Immutable. |
| `name` | `string` | yes | Trimmed; 1–40 chars; unique across statuses (case-insensitive). |
| `order` | `number` | yes | Stable display order. |
| `isSeeded` | `boolean` | yes | True for the three defaults. |
| `isCompleted` | `boolean` | yes | Exactly one Status in the system has `isCompleted = true`. |

**Invariants**:
- Exactly one Status has `isCompleted = true` at all times (FR-009).
- Reassigning or deleting the completed-Status requires designating a new
  completed Status as part of the same operation (FR-009).
- At least one Status MUST exist at all times (FR-008).

---

### Tree

A visual record of a completed task in the forest.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `taskId` | `string` (Task.id) | yes | Primary key. 1:1 with a completed Task. |
| `plantedAt` | `string` (ISO-8601) | yes | Mirrors the Task's `completedAt` at plant time. |
| `seed` | `number` | yes | Deterministic seed derived from `taskId`. Drives species, x/y position, and scale. Cached so the forest is a stable place. |

**Invariants**:
- A Tree exists iff the corresponding Task has `completedAt` set (FR-014).
- Un-completing the Task removes the Tree (FR-013 + spec Assumptions).
- The seed is derived from `taskId` and is stable across reloads and across
  export/import.

---

### Preferences

User-level settings.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `lastFilters` | `{ categoryId?: string; statusId?: string; dueBucket?: "today"\|"thisWeek"\|"overdue"\|"none" }` | no | Persisted per the spec's "Filter persistence" assumption. |
| `reducedMotion` | `"system"` \| `"always"` \| `"never"` | yes | Default `"system"`; overrides `prefers-reduced-motion`. |
| `lastExportAt` | `string` (ISO-8601) | no | Informational; shown in Settings. |

---

### AppState (root)

The single object persisted to localStorage.

```text
AppState {
  schema: 1
  tasks: Task[]
  categories: Category[]
  statuses: Status[]
  trees: Tree[]
  prefs: Preferences
}
```

**Invariants across the whole state**:
- Every `Task.categoryId` and `Task.statusId` is present in the respective
  arrays (referential integrity).
- Exactly one `Status.isCompleted === true`.
- For every Task where `statusId` maps to the completed Status, exactly one
  Tree with matching `taskId` exists; and vice versa.

---

## Validation rules (derived from FR-###)

| Source | Rule |
|--------|------|
| FR-001, FR-002 | `title` required and non-empty; other fields optional at create time. |
| FR-002 | `createdAt` auto-set and immutable; `completedAt` auto-managed on status transitions. |
| FR-005 | Seed categories/statuses on first run only (guarded by presence of `fts.v1` key). |
| FR-007 | Delete-category and delete-status operations require a `reassignTo` target when tasks reference the subject. |
| FR-008 | Reject category/status deletions that would leave the collection empty. |
| FR-009 | Reject any operation that would remove the sole completed Status without designating a replacement. |
| FR-013 | Un-complete is a single atomic action: flip status + clear `completedAt` + remove Tree. |
| FR-019 | All writes flush the AppState to localStorage synchronously. |

---

## Derived views (selectors, not persisted)

- **Active task list**: tasks where `statusId` is NOT the completed Status,
  sorted by `(dueDate ASC nulls-last, createdAt DESC)`.
- **Completed task list**: tasks where `statusId` IS the completed Status,
  sorted by `completedAt DESC`.
- **Due-date bucketing** (for filters):
  - `today` → `dueDate == today`
  - `thisWeek` → `dueDate within today..today+6d`
  - `overdue` → `dueDate < today` AND task not completed
  - `none` → `dueDate` is null/undefined
- **Forest density**: `trees.length` drives canopy density steps (e.g.,
  1–10 / 11–50 / 51–200 / 200+). Above 500, an aggregation strategy groups
  nearby trees into stylized clusters to stay at 60 fps.
