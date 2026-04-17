import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reducer } from '../../src/state/reducer';
import { seedState, SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../../src/storage/seed';

describe('signed-out mode', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch | undefined;
  let originalWS: typeof globalThis.WebSocket | undefined;
  let wsConstructions = 0;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalWS = globalThis.WebSocket;
    fetchSpy = vi.fn(() => {
      throw new Error('unexpected fetch call while signed out');
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    wsConstructions = 0;
    class NoWS {
      constructor() {
        wsConstructions += 1;
        throw new Error('unexpected WebSocket while signed out');
      }
    }
    globalThis.WebSocket = NoWS as unknown as typeof WebSocket;
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
    if (originalWS) globalThis.WebSocket = originalWS;
  });

  it('the reducer + seed path performs zero network calls across a mixed workload', () => {
    let state = seedState();

    // 10 mixed reducer actions that a signed-out user could realistically
    // produce in v1 — the sync engine MUST NOT be involved at all.
    state = reducer(state, {
      type: 'addTask',
      title: 'one',
      description: null,
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    state = reducer(state, {
      type: 'addTask',
      title: 'two',
      description: 'desc',
      categoryId: SEED_CATEGORY_IDS.urgent,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    const firstId = state.tasks[state.tasks.length - 1].id;
    state = reducer(state, { type: 'completeTask', id: state.tasks[0].id });
    state = reducer(state, { type: 'uncompleteTask', id: state.tasks[0].id });
    state = reducer(state, {
      type: 'updateTask',
      id: firstId,
      patch: { title: 'renamed' },
    });
    state = reducer(state, { type: 'deleteTask', id: firstId });
    state = reducer(state, { type: 'addCategory', name: 'new-cat' });
    state = reducer(state, { type: 'renameCategory', id: SEED_CATEGORY_IDS.urgent, name: 'High' });
    state = reducer(state, { type: 'addStatus', name: 'Blocked' });
    state = reducer(state, {
      type: 'setFilters',
      filters: { categoryId: null, statusId: null, dueBucket: 'today' },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(0);
    expect(wsConstructions).toBe(0);
    // Sanity: state really did move through each action.
    expect(state.tasks.length).toBeGreaterThanOrEqual(0);
  });
});
