export type SyncStatusState = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncStatusSnapshot {
  state: SyncStatusState;
  lastSyncedAt: string | null;
  lastError: string | null;
}

type Listener = (snapshot: SyncStatusSnapshot) => void;

let current: SyncStatusSnapshot = {
  state: 'synced',
  lastSyncedAt: null,
  lastError: null,
};
const listeners = new Set<Listener>();

export function get(): SyncStatusSnapshot {
  return current;
}

export function set(
  state: SyncStatusState,
  extras: { lastSyncedAt?: string | null; lastError?: string | null } = {},
): void {
  current = {
    state,
    lastSyncedAt: extras.lastSyncedAt ?? current.lastSyncedAt,
    lastError: extras.lastError ?? (state === 'error' || state === 'offline' ? current.lastError : null),
  };
  listeners.forEach((l) => l(current));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

// Test helper — resets to defaults between tests.
export function _resetForTests(): void {
  current = { state: 'synced', lastSyncedAt: null, lastError: null };
  listeners.clear();
}
