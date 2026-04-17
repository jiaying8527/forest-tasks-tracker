import { describe, it, expect } from 'vitest';
import { activeTasks, applyFilters, completedTasks, completedStatusId } from '../../src/state/selectors';
import { reducer } from '../../src/state/reducer';
import { seedState, SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../../src/storage/seed';
import type { AppState } from '../../src/storage/schema';

function addTask(
  s: AppState,
  title: string,
  overrides: Partial<{ categoryId: string; statusId: string; dueDate: string | null }> = {},
): AppState {
  return reducer(s, {
    type: 'addTask',
    title,
    description: null,
    categoryId: overrides.categoryId ?? SEED_CATEGORY_IDS.taskToDo,
    statusId: overrides.statusId ?? SEED_STATUS_IDS.newStatus,
    dueDate: overrides.dueDate ?? null,
  });
}

describe('selectors: active / completed partitioning', () => {
  it('activeTasks excludes the completed status', () => {
    let s = seedState();
    s = addTask(s, 'a');
    const id = s.tasks[0].id;
    s = reducer(s, { type: 'completeTask', id });
    s = addTask(s, 'b');
    expect(activeTasks(s).map((t) => t.title)).toEqual(['b']);
    expect(completedTasks(s).map((t) => t.title)).toEqual(['a']);
  });

  it('completedStatusId returns the flagged status', () => {
    expect(completedStatusId(seedState())).toBe(SEED_STATUS_IDS.completed);
  });
});

describe('selectors: applyFilters combinations', () => {
  const now = new Date(2026, 3, 17);

  function build(): AppState {
    let s = seedState();
    s = addTask(s, 'urgent-today', {
      categoryId: SEED_CATEGORY_IDS.urgent,
      dueDate: '2026-04-17',
    });
    s = addTask(s, 'urgent-overdue', {
      categoryId: SEED_CATEGORY_IDS.urgent,
      dueDate: '2026-04-10',
    });
    s = addTask(s, 'todo-later', {
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      dueDate: '2026-04-19',
    });
    s = addTask(s, 'wait-none', {
      categoryId: SEED_CATEGORY_IDS.needWait,
      statusId: SEED_STATUS_IDS.inProgress,
      dueDate: null,
    });
    return s;
  }

  it('category × dueBucket filters combine', () => {
    const s = build();
    const out = applyFilters(
      s,
      { categoryId: SEED_CATEGORY_IDS.urgent, statusId: null, dueBucket: 'overdue' },
      now,
    );
    expect(out.map((t) => t.title)).toEqual(['urgent-overdue']);
  });

  it('status filter narrows to a single status', () => {
    const s = build();
    const out = applyFilters(
      s,
      { categoryId: null, statusId: SEED_STATUS_IDS.inProgress, dueBucket: null },
      now,
    );
    expect(out.map((t) => t.title)).toEqual(['wait-none']);
  });

  it('none bucket matches tasks without a due date', () => {
    const s = build();
    const out = applyFilters(
      s,
      { categoryId: null, statusId: null, dueBucket: 'none' },
      now,
    );
    expect(out.map((t) => t.title)).toEqual(['wait-none']);
  });

  it('no filters returns all active tasks (sorted)', () => {
    const s = build();
    const out = applyFilters(s, { categoryId: null, statusId: null, dueBucket: null }, now);
    expect(out.length).toBe(4);
  });
});
