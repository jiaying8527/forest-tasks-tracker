import { describe, it, expect } from 'vitest';
import {
  loadState,
  saveState,
  StorageQuotaError,
  StorageSchemaTooNewError,
} from '../../src/storage/localStorage';
import { CURRENT_SCHEMA, STORAGE_KEY } from '../../src/storage/schema';
import { seedState, SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../../src/storage/seed';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(i: number): string | null {
    return Array.from(this.store.keys())[i] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

class QuotaStorage extends MemoryStorage {
  override setItem(_key: string, _value: string): void {
    const err = new Error('over quota');
    err.name = 'QuotaExceededError';
    throw err;
  }
}

describe('first-run seed', () => {
  it('returns seed with default categories and one completed status', () => {
    const s = seedState();
    expect(s.schema).toBe(CURRENT_SCHEMA);
    expect(s.categories.map((c) => c.id)).toEqual([
      SEED_CATEGORY_IDS.taskToDo,
      SEED_CATEGORY_IDS.needWait,
      SEED_CATEGORY_IDS.urgent,
    ]);
    expect(s.statuses.filter((x) => x.isCompleted)).toHaveLength(1);
    expect(s.statuses.find((x) => x.isCompleted)?.id).toBe(SEED_STATUS_IDS.completed);
  });
});

describe('loadState / saveState', () => {
  it('returns seed when storage is empty', () => {
    const storage = new MemoryStorage();
    expect(loadState(storage)).toEqual(seedState());
  });

  it('round-trips state', () => {
    const storage = new MemoryStorage();
    const s = seedState();
    saveState(s, storage);
    expect(loadState(storage)).toEqual(s);
  });

  it('falls back to seed on corrupt JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, 'not json');
    expect(loadState(storage)).toEqual(seedState());
  });

  it('refuses to load a schema newer than this build', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...seedState(), schema: CURRENT_SCHEMA + 1 }),
    );
    expect(() => loadState(storage)).toThrow(StorageSchemaTooNewError);
  });

  it('surfaces quota errors as StorageQuotaError', () => {
    const storage = new QuotaStorage();
    expect(() => saveState(seedState(), storage)).toThrow(StorageQuotaError);
  });
});
