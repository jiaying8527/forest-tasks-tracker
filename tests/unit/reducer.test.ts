import { describe, it, expect, beforeEach } from 'vitest';
import { reducer, InvariantError } from '../../src/state/reducer';
import { seedState, SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../../src/storage/seed';
import type { AppState } from '../../src/storage/schema';

function add(state: AppState, title: string, overrides: Partial<{ dueDate: string | null; statusId: string }> = {}): AppState {
  return reducer(state, {
    type: 'addTask',
    title,
    description: null,
    categoryId: SEED_CATEGORY_IDS.taskToDo,
    statusId: overrides.statusId ?? SEED_STATUS_IDS.newStatus,
    dueDate: overrides.dueDate ?? null,
  });
}

describe('reducer: tasks', () => {
  let s: AppState;
  beforeEach(() => { s = seedState(); });

  it('addTask rejects empty titles', () => {
    expect(() => reducer(s, { type: 'addTask', title: '   ', description: null, categoryId: SEED_CATEGORY_IDS.taskToDo, statusId: SEED_STATUS_IDS.newStatus, dueDate: null })).toThrow(InvariantError);
  });

  it('addTask prepends new tasks and sets createdAt', () => {
    s = add(s, 'first');
    s = add(s, 'second');
    expect(s.tasks.map((t) => t.title)).toEqual(['second', 'first']);
    expect(s.tasks[0].createdAt).toBeTruthy();
    expect(s.tasks[0].completedAt).toBeNull();
  });

  it('completeTask sets completedAt, remembers priorStatusId, and plants exactly one tree', () => {
    s = add(s, 'a');
    const id = s.tasks[0].id;
    s = reducer(s, { type: 'completeTask', id });
    expect(s.tasks[0].statusId).toBe(SEED_STATUS_IDS.completed);
    expect(s.tasks[0].completedAt).not.toBeNull();
    expect(s.tasks[0].priorStatusId).toBe(SEED_STATUS_IDS.newStatus);
    expect(s.trees).toHaveLength(1);
    expect(s.trees[0].taskId).toBe(id);
  });

  it('completeTask is idempotent for already-completed tasks', () => {
    s = add(s, 'a');
    const id = s.tasks[0].id;
    s = reducer(s, { type: 'completeTask', id });
    const snapshot = s;
    s = reducer(s, { type: 'completeTask', id });
    expect(s).toBe(snapshot);
  });

  it('uncompleteTask restores priorStatusId and removes the tree', () => {
    s = add(s, 'a');
    const id = s.tasks[0].id;
    s = reducer(s, { type: 'completeTask', id });
    s = reducer(s, { type: 'uncompleteTask', id });
    expect(s.tasks[0].statusId).toBe(SEED_STATUS_IDS.newStatus);
    expect(s.tasks[0].completedAt).toBeNull();
    expect(s.trees).toHaveLength(0);
  });

  it('deleteTask removes the task and any corresponding tree', () => {
    s = add(s, 'a');
    const id = s.tasks[0].id;
    s = reducer(s, { type: 'completeTask', id });
    s = reducer(s, { type: 'deleteTask', id });
    expect(s.tasks).toHaveLength(0);
    expect(s.trees).toHaveLength(0);
  });
});

describe('reducer: categories', () => {
  let s: AppState;
  beforeEach(() => { s = seedState(); });

  it('addCategory rejects duplicates (case-insensitive)', () => {
    expect(() => reducer(s, { type: 'addCategory', name: 'urgent' })).toThrow(InvariantError);
  });

  it('renameCategory updates the name and does not touch task references', () => {
    s = add(s, 'x');
    s = reducer(s, { type: 'renameCategory', id: SEED_CATEGORY_IDS.urgent, name: 'High priority' });
    expect(s.categories.find((c) => c.id === SEED_CATEGORY_IDS.urgent)?.name).toBe('High priority');
    expect(s.tasks[0].categoryId).toBe(SEED_CATEGORY_IDS.taskToDo);
  });

  it('deleteCategory requires reassignTo and reassigns dependent tasks', () => {
    s = add(s, 'x');
    expect(() =>
      reducer(s, {
        type: 'deleteCategory',
        id: SEED_CATEGORY_IDS.taskToDo,
        reassignTo: SEED_CATEGORY_IDS.taskToDo,
      }),
    ).toThrow(InvariantError);
    const next = reducer(s, {
      type: 'deleteCategory',
      id: SEED_CATEGORY_IDS.taskToDo,
      reassignTo: SEED_CATEGORY_IDS.urgent,
    });
    expect(next.categories.some((c) => c.id === SEED_CATEGORY_IDS.taskToDo)).toBe(false);
    expect(next.tasks[0].categoryId).toBe(SEED_CATEGORY_IDS.urgent);
  });

  it('deleteCategory rejects when it would leave zero categories', () => {
    // Delete two of three first
    s = reducer(s, {
      type: 'deleteCategory',
      id: SEED_CATEGORY_IDS.needWait,
      reassignTo: SEED_CATEGORY_IDS.taskToDo,
    });
    s = reducer(s, {
      type: 'deleteCategory',
      id: SEED_CATEGORY_IDS.urgent,
      reassignTo: SEED_CATEGORY_IDS.taskToDo,
    });
    expect(() =>
      reducer(s, {
        type: 'deleteCategory',
        id: SEED_CATEGORY_IDS.taskToDo,
        reassignTo: SEED_CATEGORY_IDS.taskToDo,
      }),
    ).toThrow(InvariantError);
  });
});

describe('reducer: statuses', () => {
  let s: AppState;
  beforeEach(() => { s = seedState(); });

  it('deleting the completed status requires a replacement', () => {
    expect(() =>
      reducer(s, {
        type: 'deleteStatus',
        id: SEED_STATUS_IDS.completed,
        reassignTo: SEED_STATUS_IDS.newStatus,
      }),
    ).toThrow(InvariantError);
    const next = reducer(s, {
      type: 'deleteStatus',
      id: SEED_STATUS_IDS.completed,
      reassignTo: SEED_STATUS_IDS.newStatus,
      newCompletedStatusId: SEED_STATUS_IDS.inProgress,
    });
    expect(next.statuses.find((x) => x.isCompleted)?.id).toBe(SEED_STATUS_IDS.inProgress);
  });

  it('setCompletedStatus moves the completed flag exclusively', () => {
    const next = reducer(s, { type: 'setCompletedStatus', id: SEED_STATUS_IDS.inProgress });
    expect(next.statuses.filter((x) => x.isCompleted).map((x) => x.id)).toEqual([
      SEED_STATUS_IDS.inProgress,
    ]);
  });
});
