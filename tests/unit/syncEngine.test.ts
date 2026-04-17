import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncEngine, type StoreBridge } from '../../src/sync/SyncEngine';
import * as syncStatus from '../../src/sync/syncStatus';
import { seedState, SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../../src/storage/seed';
import { reducer } from '../../src/state/reducer';
import type { AppState } from '../../src/storage/schema';
import type { Action } from '../../src/state/actions';
import {
  createMockSupabase,
  type MockSupabase,
} from '../../src/sync/__mocks__/supabase-client';

function makeStore(initial: AppState): StoreBridge & { applyAction: (a: Action) => void; state: AppState } {
  let state = initial;
  const listeners = new Set<() => void>();
  const bridge = {
    getState: () => state,
    dispatch: (action: Action) => {
      state = reducer(state, action);
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    applyAction: (action: Action) => {
      state = reducer(state, action);
      listeners.forEach((l) => l());
    },
    get state() {
      return state;
    },
  };
  return bridge;
}

function never() {
  return async () => {
    throw new Error('promptReplaceLocal should not have been called');
  };
}

describe('SyncEngine', () => {
  let mock: MockSupabase;
  beforeEach(() => {
    syncStatus._resetForTests();
    mock = createMockSupabase();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('pull-on-auth inserts a seed row for a brand-new user', async () => {
    const store = makeStore(seedState());
    const engine = new SyncEngine({
      supabase: mock as never,
      store,
      hasLocalUserData: () => false,
      promptReplaceLocal: never(),
      debounceMs: 10,
    });
    await engine.start('user-1');
    expect(mock._rows.has('user-1')).toBe(true);
    expect(syncStatus.get().state).toBe('synced');
    await engine.stop();
  });

  it('pull-on-auth replaces local state when a cloud row already exists and local is clean', async () => {
    // Seed the cloud with a task that isn't on the device.
    const cloudState = reducer(seedState(), {
      type: 'addTask',
      title: 'cloud task',
      description: null,
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    mock._pushUpdate({ user_id: 'user-1', state: cloudState, updated_at: '2026-04-17T09:00:00.000Z' });

    const store = makeStore(seedState());
    const engine = new SyncEngine({
      supabase: mock as never,
      store,
      hasLocalUserData: () => false,
      promptReplaceLocal: never(),
      debounceMs: 10,
    });
    await engine.start('user-1');
    expect(store.getState().tasks.map((t) => t.title)).toEqual(['cloud task']);
    await engine.stop();
  });

  it('pull-on-auth prompts when local has user data; signs out on decline', async () => {
    const cloudState = seedState();
    mock._pushUpdate({ user_id: 'user-1', state: cloudState, updated_at: '2026-04-17T09:00:00.000Z' });

    const local = reducer(seedState(), {
      type: 'addTask',
      title: 'local',
      description: null,
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    const store = makeStore(local);
    const engine = new SyncEngine({
      supabase: mock as never,
      store,
      hasLocalUserData: () => true,
      promptReplaceLocal: async () => false,
      debounceMs: 10,
    });
    await engine.start('user-1');
    expect(mock._signOutCalls).toBe(1);
    // Local state untouched because the user declined.
    expect(store.getState().tasks.map((t) => t.title)).toEqual(['local']);
    await engine.stop();
  });

  it('debounces bursts of mutations into one upsert', async () => {
    const store = makeStore(seedState());
    const engine = new SyncEngine({
      supabase: mock as never,
      store,
      hasLocalUserData: () => false,
      promptReplaceLocal: never(),
      debounceMs: 50,
    });
    await engine.start('user-1');
    const upsertsBefore = mock._rows.get('user-1')?.updated_at;

    for (let i = 0; i < 5; i++) {
      store.applyAction({
        type: 'addTask',
        title: `t${i}`,
        description: null,
        categoryId: SEED_CATEGORY_IDS.taskToDo,
        statusId: SEED_STATUS_IDS.newStatus,
        dueDate: null,
      });
    }

    await vi.advanceTimersByTimeAsync(60);
    // Allow microtasks to settle after the debounced fire.
    await vi.runOnlyPendingTimersAsync();

    const row = mock._rows.get('user-1');
    expect(row).toBeDefined();
    expect(row!.state.tasks.length).toBe(5);
    expect(row!.updated_at).not.toBe(upsertsBefore);
    expect(syncStatus.get().state).toBe('synced');
    await engine.stop();
  });

  it('realtime updates with newer updated_at replace local state', async () => {
    const store = makeStore(seedState());
    const engine = new SyncEngine({
      supabase: mock as never,
      store,
      hasLocalUserData: () => false,
      promptReplaceLocal: never(),
      debounceMs: 10,
    });
    await engine.start('user-1');

    const other = reducer(seedState(), {
      type: 'addTask',
      title: 'from device B',
      description: null,
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    mock._pushUpdate({
      user_id: 'user-1',
      state: other,
      updated_at: '2099-01-01T00:00:00.000Z',
    });
    expect(store.getState().tasks.map((t) => t.title)).toEqual(['from device B']);
    await engine.stop();
  });

  it('self-echo: realtime payload with updated_at <= lastCloudUpdatedAt is ignored', async () => {
    const store = makeStore(seedState());
    const engine = new SyncEngine({
      supabase: mock as never,
      store,
      hasLocalUserData: () => false,
      promptReplaceLocal: never(),
      debounceMs: 10,
    });
    await engine.start('user-1');
    // Mutate locally to drive an upsert round-trip.
    store.applyAction({
      type: 'addTask',
      title: 'alpha',
      description: null,
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    await vi.advanceTimersByTimeAsync(20);
    await vi.runOnlyPendingTimersAsync();

    const stateBefore = store.getState();
    const row = mock._rows.get('user-1')!;
    // Replay the same updated_at as a self-echo — should be ignored.
    const tamperedState = reducer(row.state, {
      type: 'addTask',
      title: 'should not appear',
      description: null,
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    mock._pushUpdate({
      user_id: 'user-1',
      state: tamperedState,
      updated_at: row.updated_at,
    });
    expect(store.getState()).toBe(stateBefore);
    await engine.stop();
  });

  it('auth error on upsert signs the user out', async () => {
    const store = makeStore(seedState());
    const engine = new SyncEngine({
      supabase: mock as never,
      store,
      hasLocalUserData: () => false,
      promptReplaceLocal: never(),
      debounceMs: 10,
    });
    await engine.start('user-1');

    mock._fail.next = { name: 'AuthApiError', message: 'JWT expired' };
    store.applyAction({
      type: 'addTask',
      title: 'x',
      description: null,
      categoryId: SEED_CATEGORY_IDS.taskToDo,
      statusId: SEED_STATUS_IDS.newStatus,
      dueDate: null,
    });
    await vi.advanceTimersByTimeAsync(20);
    await vi.runOnlyPendingTimersAsync();
    expect(mock._signOutCalls).toBe(1);
    await engine.stop();
  });
});
