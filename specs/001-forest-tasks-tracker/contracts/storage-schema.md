# Storage Contract: localStorage Schema

**Feature**: 001-forest-tasks-tracker | **Date**: 2026-04-17

This contract defines exactly what the app reads from and writes to
`window.localStorage`. The format is authoritative — any code that
touches localStorage MUST go through `src/storage/localStorage.ts` and
conform to this shape.

---

## Storage key

```
fts.v1
```

A single key holds the entire AppState as a JSON string. Rationale:
atomic from the user's perspective, trivial to export, and small enough
for localStorage to handle comfortably.

---

## Root shape

```jsonc
{
  "schema": 1,
  "tasks":       [ /* Task[]      */ ],
  "categories":  [ /* Category[]  */ ],
  "statuses":    [ /* Status[]    */ ],
  "trees":       [ /* Tree[]      */ ],
  "prefs":       { /* Preferences */ }
}
```

### `schema` (integer, required)

Version of this schema. Starts at `1`. Bumped **only** when the shape
changes in a way that requires a migration. The storage module MUST:

1. On read, detect the stored `schema` number.
2. Apply migrations in order until the state reaches the current
   schema (`1` today).
3. Write back under the same `fts.v1` key with the new `schema` number.
4. If `schema` is newer than the code understands, refuse to load and
   surface a clear "this build is older than your data" error rather
   than silently downgrading.

---

## Entity shapes

Fields match [data-model.md](../data-model.md). Only the physical
differences are called out here.

### Task

```jsonc
{
  "id":            "aBcD12EfGhIj",
  "title":         "Buy groceries",
  "description":   "milk, bread",
  "categoryId":    "cat_taskToDo",
  "statusId":      "sts_new",
  "createdAt":     "2026-04-17T09:14:22.000",
  "dueDate":       "2026-04-19",
  "completedAt":   null,
  "priorStatusId": null
}
```

- Timestamps are local-time ISO-8601 with no timezone designator.
- `dueDate` is `YYYY-MM-DD` or absent (`undefined` omitted, or `null`).
- Optional fields MAY be omitted entirely OR present as `null`.
  Readers MUST treat both as "no value".

### Category

```jsonc
{ "id": "cat_taskToDo", "name": "Task To Do", "order": 0, "isSeeded": true }
```

### Status

```jsonc
{ "id": "sts_new", "name": "New", "order": 0, "isSeeded": true, "isCompleted": false }
```

### Tree

```jsonc
{ "taskId": "aBcD12EfGhIj", "plantedAt": "2026-04-17T10:01:00.000", "seed": 2847193 }
```

### Preferences

```jsonc
{
  "lastFilters":    { "categoryId": null, "statusId": null, "dueBucket": null },
  "reducedMotion":  "system",
  "lastExportAt":   "2026-04-16T22:00:00.000"
}
```

---

## First-run seed

If `localStorage.getItem("fts.v1")` returns `null`, the storage module
MUST synthesize and persist this initial state:

```jsonc
{
  "schema": 1,
  "tasks": [],
  "categories": [
    { "id": "cat_taskToDo", "name": "Task To Do",   "order": 0, "isSeeded": true },
    { "id": "cat_needWait", "name": "Need To Wait", "order": 1, "isSeeded": true },
    { "id": "cat_urgent",   "name": "Urgent",       "order": 2, "isSeeded": true }
  ],
  "statuses": [
    { "id": "sts_new",       "name": "New",         "order": 0, "isSeeded": true, "isCompleted": false },
    { "id": "sts_inProgress","name": "In Progress", "order": 1, "isSeeded": true, "isCompleted": false },
    { "id": "sts_completed", "name": "Completed",   "order": 2, "isSeeded": true, "isCompleted": true  }
  ],
  "trees": [],
  "prefs": {
    "lastFilters":   { "categoryId": null, "statusId": null, "dueBucket": null },
    "reducedMotion": "system"
  }
}
```

Seed IDs are **stable** (`cat_taskToDo` etc.) rather than random so the
defaults survive rename operations cleanly and migrations can reference
them. User-created categories/statuses use nanoid.

---

## Write semantics

- Every reducer-produced state is serialized with `JSON.stringify` and
  written to `fts.v1` synchronously.
- Write is wrapped in `try/catch`:
  - On `QuotaExceededError`: throw a typed `StorageQuotaError` up to the
    UI layer, which surfaces a friendly toast ("Your device is out of
    space — export your data and remove completed tasks"). The pending
    edit is NOT dropped; the user can retry.
  - On any other error: log, surface a generic write-failed toast.
- Reads happen once at app boot (hydration); thereafter the in-memory
  reducer state is the source of truth.

---

## Size expectations (for reasoning, not a hard limit)

| Per entity | Approx bytes | 1,000 tasks |
|------------|--------------|-------------|
| Task | ~250 | ~250 KB |
| Category | ~80 | (few) |
| Status | ~90 | (few) |
| Tree | ~70 | ~70 KB |

A heavy personal user (1,000 active + 1,000 completed) stays comfortably
under a typical 5 MB localStorage ceiling.

---

## Backwards/forwards compatibility

- Adding an optional field: PATCH change to the schema, no version bump.
  Readers treat missing/null as absent.
- Renaming or removing a field, changing a field's type, or changing an
  invariant: MINOR or MAJOR schema bump with a migration entry.
- The storage module MUST never silently discard unknown fields on read
  (future-proofing forward-rolled data).
