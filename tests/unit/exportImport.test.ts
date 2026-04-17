import { describe, it, expect } from 'vitest';
import {
  EXPORT_APP_TAG,
  exportEnvelope,
  parseImport,
  validateEnvelope,
} from '../../src/lib/exportImport';
import { seedState, SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../../src/storage/seed';
import { reducer } from '../../src/state/reducer';
import { CURRENT_SCHEMA } from '../../src/storage/schema';

function populated() {
  let s = seedState();
  s = reducer(s, {
    type: 'addTask',
    title: 'done',
    description: null,
    categoryId: SEED_CATEGORY_IDS.taskToDo,
    statusId: SEED_STATUS_IDS.newStatus,
    dueDate: null,
  });
  const id = s.tasks[0].id;
  s = reducer(s, { type: 'completeTask', id });
  return s;
}

describe('exportImport', () => {
  it('round-trips a populated state', () => {
    const s = populated();
    const env = exportEnvelope(s);
    const json = JSON.stringify(env);
    const result = parseImport(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state).toEqual(s);
  });

  it('rejects wrong app tag', () => {
    const env = { ...exportEnvelope(seedState()), app: 'something-else' };
    const r = validateEnvelope(env);
    expect(r.ok).toBe(false);
  });

  it('rejects schema newer than build', () => {
    const env = { ...exportEnvelope(seedState()), schema: CURRENT_SCHEMA + 1 };
    const r = validateEnvelope(env);
    expect(r.ok).toBe(false);
  });

  it('rejects malformed json', () => {
    expect(parseImport('{not json').ok).toBe(false);
  });

  it('rejects referential-integrity violations: orphan tree', () => {
    const s = seedState();
    const env = exportEnvelope({ ...s, trees: [{ taskId: 'orphan', plantedAt: '2026-04-17', seed: 1 }] });
    const r = validateEnvelope(env);
    expect(r.ok).toBe(false);
  });

  it('rejects when there are zero or multiple completed statuses', () => {
    const s = seedState();
    const none = exportEnvelope({
      ...s,
      statuses: s.statuses.map((x) => ({ ...x, isCompleted: false })),
    });
    const many = exportEnvelope({
      ...s,
      statuses: s.statuses.map((x) => ({ ...x, isCompleted: true })),
    });
    expect(validateEnvelope(none).ok).toBe(false);
    expect(validateEnvelope(many).ok).toBe(false);
  });

  it('envelope uses the canonical app tag', () => {
    expect(exportEnvelope(seedState()).app).toBe(EXPORT_APP_TAG);
  });
});
