import { describe, it, expect } from 'vitest';
import { bucketDueDate, nowLocalISO, todayISO } from '../../src/lib/dates';

const fixed = new Date(2026, 3, 17); // Apr 17 2026 local

describe('bucketDueDate', () => {
  it('returns none for null / undefined due dates', () => {
    expect(bucketDueDate(null, false, fixed)).toBe('none');
  });

  it('returns today for exact match', () => {
    expect(bucketDueDate('2026-04-17', false, fixed)).toBe('today');
  });

  it('returns thisWeek for 1..6 days out', () => {
    expect(bucketDueDate('2026-04-18', false, fixed)).toBe('thisWeek');
    expect(bucketDueDate('2026-04-23', false, fixed)).toBe('thisWeek');
  });

  it('returns later for 7+ days out', () => {
    expect(bucketDueDate('2026-04-24', false, fixed)).toBe('later');
  });

  it('returns overdue for past dates when not completed', () => {
    expect(bucketDueDate('2026-04-16', false, fixed)).toBe('overdue');
  });

  it('suppresses overdue for completed tasks (classifies as later)', () => {
    expect(bucketDueDate('2026-04-16', true, fixed)).toBe('later');
  });
});

describe('todayISO / nowLocalISO', () => {
  it('todayISO formats as YYYY-MM-DD local', () => {
    expect(todayISO(fixed)).toBe('2026-04-17');
  });

  it('nowLocalISO has no timezone designator and the expected prefix', () => {
    const iso = nowLocalISO(fixed);
    expect(iso.startsWith('2026-04-17T')).toBe(true);
    expect(iso.endsWith('Z')).toBe(false);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });
});
