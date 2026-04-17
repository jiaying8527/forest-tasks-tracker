import type { DueBucket } from '../storage/schema';

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO-8601 local-time timestamp, no timezone designator. */
export function nowLocalISO(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.` +
    `${String(now.getMilliseconds()).padStart(3, '0')}`
  );
}

function parseDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function bucketDueDate(
  dueDate: string | null,
  isCompleted: boolean,
  now: Date = new Date(),
): DueBucket {
  if (!dueDate) return 'none';
  const parsed = parseDateOnly(dueDate);
  if (!parsed) return 'none';
  const diff = daysBetween(parsed, now);
  if (diff < 0) return isCompleted ? 'later' : 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 6) return 'thisWeek';
  return 'later';
}
