import { afterEach, describe, expect, it, vi } from 'vitest';
import * as syncStatus from '../../src/sync/syncStatus';

afterEach(() => {
  syncStatus._resetForTests();
});

describe('syncStatus', () => {
  it('subscribers receive the current snapshot on subscribe', () => {
    const listener = vi.fn();
    syncStatus.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ state: 'synced' }));
  });

  it('set() notifies all subscribers synchronously with the new state', () => {
    const a = vi.fn();
    const b = vi.fn();
    syncStatus.subscribe(a);
    syncStatus.subscribe(b);
    a.mockClear();
    b.mockClear();
    syncStatus.set('syncing');
    expect(a).toHaveBeenCalledWith(expect.objectContaining({ state: 'syncing' }));
    expect(b).toHaveBeenCalledWith(expect.objectContaining({ state: 'syncing' }));
  });

  it('get() returns the last set() value', () => {
    syncStatus.set('offline', { lastError: 'no net' });
    expect(syncStatus.get()).toEqual({
      state: 'offline',
      lastSyncedAt: null,
      lastError: 'no net',
    });
  });

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn();
    const unsubscribe = syncStatus.subscribe(listener);
    listener.mockClear();
    unsubscribe();
    syncStatus.set('syncing');
    expect(listener).not.toHaveBeenCalled();
  });
});
