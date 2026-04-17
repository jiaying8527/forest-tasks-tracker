# Export / Import Contract

**Feature**: 001-forest-tasks-tracker | **Date**: 2026-04-17

Defines the on-disk format of the export file (User Story 5) and the
validation rules used when importing.

---

## File format

**Filename (default)**: `forest-tasks-tracker-YYYY-MM-DD.json`
**MIME type**: `application/json`
**Encoding**: UTF-8, no BOM

**Top-level shape**:

```jsonc
{
  "app":           "forest-tasks-tracker",
  "schema":        1,
  "exportedAt":    "2026-04-17T10:05:00.000",
  "state": {
    "schema":       1,
    "tasks":        [ /* … */ ],
    "categories":   [ /* … */ ],
    "statuses":     [ /* … */ ],
    "trees":        [ /* … */ ],
    "prefs":        { /* … */ }
  }
}
```

- `app` is a fixed constant used to reject files from other tools.
- The outer `schema` and the inner `state.schema` are the same number
  today. Carrying both leaves room for future envelope-level changes
  (e.g., optional metadata) without touching the state schema.

---

## Export rules

- Exported data is a **verbatim snapshot** of the current AppState —
  including `prefs`. No PII filtering is needed because there is no
  account, and everything is the user's own data.
- The export does **not** include derived data that could be recomputed
  (e.g., no memoized selectors). Trees ARE included because their
  `seed` field is part of persisted state and guarantees the forest
  looks identical after re-import.

---

## Import rules

The import path MUST be **validate → confirm → replace**, in that order.

### 1. Validate (pure, no side effects)

Reject the file with a clear message if any of:

- Invalid JSON.
- Missing or wrong top-level `"app"` (must equal `"forest-tasks-tracker"`).
- Missing `"schema"` or `"state"`.
- `schema` is a number the current build does not understand (either
  too old with no migration path, or newer than this build).
- Any referential-integrity violation in `state`:
  - A `Task.categoryId` or `Task.statusId` does not resolve to an
    entity in the imported `categories` / `statuses`.
  - More than one Status has `isCompleted: true`, or none do.
  - Zero categories or zero statuses.
  - A Tree references a Task that doesn't exist or isn't completed.

Validation is **pure**: it never touches the existing AppState.

### 2. Confirm

Before writing anything, the app MUST show a modal:

> "Importing will replace your current tasks, categories, statuses, and
> forest with the contents of this file. This cannot be undone."

With an explicit **Replace my data** destructive action and a **Cancel**
default. Only on explicit confirmation does the import proceed.

### 3. Replace

- Run any applicable schema migrations on the imported `state` to bring
  it up to the current schema.
- Persist the result via the normal storage module (single
  `fts.v1` write).
- Reload in-memory reducer state from the freshly persisted blob.
- Show a success toast with a count summary ("Restored 42 tasks,
  3 categories, 3 statuses, 18 trees").

---

## Rationale

- **Whole-state replace, not merge**: Merging user data from two
  localStorage histories is a minefield of ID collisions and
  referential ambiguity for near-zero real-world benefit (users export
  to *back up*, not to sync between devices concurrently). Keep it
  simple; fail loudly on invalid input.
- **Pure validation phase**: Guarantees the user's current data is
  never partially overwritten when an import fails.
- **Stable file shape**: The `app` + `schema` envelope gives us room
  to evolve without ever silently accepting an incompatible file.
