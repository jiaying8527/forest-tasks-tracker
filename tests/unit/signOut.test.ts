import { describe, expect, it } from 'vitest';
import { clearAllCloudSyncedState } from '../../src/storage/localStorage';
import { STORAGE_KEY } from '../../src/storage/schema';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  removeItem(k: string) { this.store.delete(k); }
  setItem(k: string, v: string) { this.store.set(k, v); }
}

describe('sign-out wipe', () => {
  it('clearAllCloudSyncedState removes the fts.v1 key', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schema: 1 }));
    storage.setItem('fts.auth', 'supabase-session-opaque');
    clearAllCloudSyncedState(storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    // Supabase's own session key is not touched by us — signOut() handles it.
    expect(storage.getItem('fts.auth')).toBe('supabase-session-opaque');
  });
});
