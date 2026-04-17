import type { AppState } from './schema';
import { CURRENT_SCHEMA, STORAGE_KEY } from './schema';
import { seedState } from './seed';

export class StorageQuotaError extends Error {
  constructor() {
    super('Browser storage is full');
    this.name = 'StorageQuotaError';
  }
}

export class StorageSchemaTooNewError extends Error {
  constructor(public readonly found: number) {
    super(`Stored schema ${found} is newer than this build (${CURRENT_SCHEMA})`);
    this.name = 'StorageSchemaTooNewError';
  }
}

type Migration = (input: unknown) => unknown;
const migrations: Record<number, Migration> = {
  // No migrations yet; when bumping CURRENT_SCHEMA add entries keyed by the
  // version being migrated FROM, each producing the next-version shape.
};

export function loadState(storage: Storage = getDefaultStorage()): AppState {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return seedState();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupted data — fall back to a fresh seed rather than crashing the app.
    return seedState();
  }

  if (!parsed || typeof parsed !== 'object' || !('schema' in parsed)) {
    return seedState();
  }

  const candidate = parsed as { schema: number };
  if (candidate.schema > CURRENT_SCHEMA) {
    throw new StorageSchemaTooNewError(candidate.schema);
  }

  let migrated: unknown = parsed;
  let version = candidate.schema;
  while (version < CURRENT_SCHEMA) {
    const step = migrations[version];
    if (!step) {
      // No migration path — treat as unusable; caller should reseed.
      return seedState();
    }
    migrated = step(migrated);
    version += 1;
  }

  return migrated as AppState;
}

export function saveState(state: AppState, storage: Storage = getDefaultStorage()): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    if (isQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
}

export function clearState(storage: Storage = getDefaultStorage()): void {
  storage.removeItem(STORAGE_KEY);
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function getDefaultStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('localStorage is only available in a browser-like environment');
  }
  return window.localStorage;
}
