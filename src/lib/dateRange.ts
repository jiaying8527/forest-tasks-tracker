export type Granularity = 'all' | 'day' | 'week' | 'month' | 'year';

export interface DateRange {
  /** Inclusive start, YYYY-MM-DD. null means open start. */
  start: string | null;
  /** Inclusive end, YYYY-MM-DD. null means open end. */
  end: string | null;
}

/** UI model: selected granularity + offset from the current period (0 = current, -1 = previous). */
export interface RangeSelection {
  granularity: Granularity;
  /** Ignored when granularity === 'all'. */
  offset: number;
}

export const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-as-start-of-week: the Monday on or before `d`, as a fresh Date at 00:00 local. */
function startOfWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // 0=Mon..6=Sun
  return addDays(startOfDay(d), -diff);
}

export function resolveRange(sel: RangeSelection, now: Date = new Date()): DateRange {
  const today = startOfDay(now);
  const { granularity, offset } = sel;

  if (granularity === 'all') return { start: null, end: null };

  if (granularity === 'day') {
    const d = addDays(today, offset);
    return { start: toISO(d), end: toISO(d) };
  }

  if (granularity === 'week') {
    const thisMon = startOfWeekMonday(today);
    const mon = addDays(thisMon, offset * 7);
    const sun = addDays(mon, 6);
    return { start: toISO(mon), end: toISO(sun) };
  }

  if (granularity === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const last = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
    return { start: toISO(first), end: toISO(last) };
  }

  // year
  const year = today.getFullYear() + offset;
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Short, human label for a resolved range, e.g. "Today", "Apr 13–19", "Sep 2018", "2026". */
export function labelForSelection(sel: RangeSelection, now: Date = new Date()): string {
  if (sel.granularity === 'all') return 'All time';

  const range = resolveRange(sel, now);
  if (!range.start || !range.end) return 'All time';

  const { granularity, offset } = sel;

  if (granularity === 'day') {
    if (offset === 0) return 'Today';
    if (offset === -1) return 'Yesterday';
    if (offset === 1) return 'Tomorrow';
    const d = parseISODate(range.start);
    return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  }

  if (granularity === 'week') {
    const start = parseISODate(range.start);
    const end = parseISODate(range.end);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
    }
    return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`;
  }

  if (granularity === 'month') {
    const d = parseISODate(range.start);
    return `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  }

  // year
  return `${parseISODate(range.start).getFullYear()}`;
}

export function isInRange(timestamp: string | null, range: DateRange): boolean {
  if (!range.start && !range.end) return true;
  if (!timestamp) return false;
  const datePart = timestamp.slice(0, 10);
  if (range.start && datePart < range.start) return false;
  if (range.end && datePart > range.end) return false;
  return true;
}

export function isGranularity(value: string): value is Granularity {
  return (GRANULARITIES as { id: string }[]).some((g) => g.id === value);
}
