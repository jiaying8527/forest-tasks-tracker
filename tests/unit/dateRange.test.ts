import { describe, it, expect } from 'vitest';
import {
  resolveRange,
  isInRange,
  isGranularity,
  labelForSelection,
} from '../../src/lib/dateRange';

// Fri Apr 17 2026 local
const fixed = new Date(2026, 3, 17);

describe('resolveRange', () => {
  it('all → open range', () => {
    expect(resolveRange({ granularity: 'all', offset: 0 }, fixed)).toEqual({
      start: null,
      end: null,
    });
  });

  it('day offset 0 = today', () => {
    expect(resolveRange({ granularity: 'day', offset: 0 }, fixed)).toEqual({
      start: '2026-04-17',
      end: '2026-04-17',
    });
  });

  it('day offset -1 = yesterday', () => {
    expect(resolveRange({ granularity: 'day', offset: -1 }, fixed)).toEqual({
      start: '2026-04-16',
      end: '2026-04-16',
    });
  });

  it('day offset +2 = day after tomorrow', () => {
    expect(resolveRange({ granularity: 'day', offset: 2 }, fixed)).toEqual({
      start: '2026-04-19',
      end: '2026-04-19',
    });
  });

  it('week offset 0 starts Monday (Apr 13) ends Sunday (Apr 19)', () => {
    expect(resolveRange({ granularity: 'week', offset: 0 }, fixed)).toEqual({
      start: '2026-04-13',
      end: '2026-04-19',
    });
  });

  it('week when today is Monday stays this week', () => {
    const mon = new Date(2026, 3, 13);
    expect(resolveRange({ granularity: 'week', offset: 0 }, mon)).toEqual({
      start: '2026-04-13',
      end: '2026-04-19',
    });
  });

  it('week when today is Sunday stays this week', () => {
    const sun = new Date(2026, 3, 19);
    expect(resolveRange({ granularity: 'week', offset: 0 }, sun)).toEqual({
      start: '2026-04-13',
      end: '2026-04-19',
    });
  });

  it('week offset -1 = previous Mon..Sun', () => {
    expect(resolveRange({ granularity: 'week', offset: -1 }, fixed)).toEqual({
      start: '2026-04-06',
      end: '2026-04-12',
    });
  });

  it('month offset 0 = current month bounds', () => {
    expect(resolveRange({ granularity: 'month', offset: 0 }, fixed)).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
    });
  });

  it('month offset -1 = previous month', () => {
    expect(resolveRange({ granularity: 'month', offset: -1 }, fixed)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
    });
  });

  it('month offset -1 from January → previous December', () => {
    const jan = new Date(2026, 0, 10);
    expect(resolveRange({ granularity: 'month', offset: -1 }, jan)).toEqual({
      start: '2025-12-01',
      end: '2025-12-31',
    });
  });

  it('year offset 0 and -1', () => {
    expect(resolveRange({ granularity: 'year', offset: 0 }, fixed)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
    expect(resolveRange({ granularity: 'year', offset: -1 }, fixed)).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
  });
});

describe('labelForSelection', () => {
  it('day 0 / -1 / +1 have friendly labels', () => {
    expect(labelForSelection({ granularity: 'day', offset: 0 }, fixed)).toBe('Today');
    expect(labelForSelection({ granularity: 'day', offset: -1 }, fixed)).toBe('Yesterday');
    expect(labelForSelection({ granularity: 'day', offset: 1 }, fixed)).toBe('Tomorrow');
  });

  it('day arbitrary offset uses weekday + month day', () => {
    expect(labelForSelection({ granularity: 'day', offset: -3 }, fixed)).toBe('Tue, Apr 14');
  });

  it('week same month → short range', () => {
    expect(labelForSelection({ granularity: 'week', offset: 0 }, fixed)).toBe('Apr 13–19');
  });

  it('month / year labels', () => {
    expect(labelForSelection({ granularity: 'month', offset: 0 }, fixed)).toBe('Apr 2026');
    expect(labelForSelection({ granularity: 'year', offset: 0 }, fixed)).toBe('2026');
  });

  it('all → "All time"', () => {
    expect(labelForSelection({ granularity: 'all', offset: 0 }, fixed)).toBe('All time');
  });
});

describe('isInRange', () => {
  it('open range matches everything', () => {
    expect(isInRange('2020-01-01T00:00:00.000', { start: null, end: null })).toBe(true);
    expect(isInRange(null, { start: null, end: null })).toBe(true);
  });

  it('null timestamp never matches a closed range', () => {
    expect(isInRange(null, { start: '2026-01-01', end: '2026-12-31' })).toBe(false);
  });

  it('inclusive bounds', () => {
    const r = { start: '2026-04-13', end: '2026-04-19' };
    expect(isInRange('2026-04-13T00:00:00.000', r)).toBe(true);
    expect(isInRange('2026-04-19T23:59:59.999', r)).toBe(true);
    expect(isInRange('2026-04-12T23:59:59.999', r)).toBe(false);
    expect(isInRange('2026-04-20T00:00:00.000', r)).toBe(false);
  });
});

describe('isGranularity', () => {
  it('accepts known granularities', () => {
    expect(isGranularity('day')).toBe(true);
    expect(isGranularity('all')).toBe(true);
    expect(isGranularity('year')).toBe(true);
  });

  it('rejects unknown', () => {
    expect(isGranularity('decade')).toBe(false);
    expect(isGranularity('')).toBe(false);
  });
});
