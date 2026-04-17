import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import { completedTasks, categoryById, statusById } from '../state/selectors';
import { DateRangePicker } from '../components/DateRangePicker';
import {
  isInRange,
  resolveRange,
  type DateRange,
  type RangeSelection,
} from '../lib/dateRange';
import './TasksCompletedRoute.css';

function isValidISODate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function TasksCompletedRoute() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStart = searchParams.get('start');
  const urlEnd = searchParams.get('end');

  const [selection, setSelection] = useState<RangeSelection>({
    granularity: 'all',
    offset: 0,
  });

  // Effective filter range: picker's resolved range takes precedence once the
  // user has made a selection; otherwise fall back to the URL dates (if any).
  const pickerRange = useMemo(() => resolveRange(selection), [selection]);
  const urlRange: DateRange | null =
    isValidISODate(urlStart) && isValidISODate(urlEnd)
      ? { start: urlStart, end: urlEnd }
      : null;
  const isAll = selection.granularity === 'all';
  const range: DateRange =
    !isAll ? pickerRange : urlRange ?? { start: null, end: null };

  // Keep the URL in sync with the picker when the picker is driving.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (!isAll && pickerRange.start && pickerRange.end) {
      params.set('start', pickerRange.start);
      params.set('end', pickerRange.end);
    } else if (isAll) {
      params.delete('start');
      params.delete('end');
    }
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [isAll, pickerRange, searchParams, setSearchParams]);

  const tasks = useMemo(
    () => completedTasks(state).filter((t) => isInRange(t.completedAt, range)),
    [state, range],
  );

  const restoreOptions = useMemo(
    () =>
      state.statuses
        .filter((s) => !s.isCompleted)
        .slice()
        .sort((a, b) => a.order - b.order),
    [state.statuses],
  );

  const restoreTo = (taskId: string, statusId: string) => {
    if (!statusId) return;
    dispatch({ type: 'updateTask', id: taskId, patch: { statusId } });
    const target = statusById(state, statusId);
    showToast({
      kind: 'info',
      message: target
        ? `Task restored to "${target.name}".`
        : 'Task restored to active list.',
    });
  };

  const hasRangeFilter = !!(range.start && range.end);

  return (
    <section className="route-completed">
      <header className="route-header">
        <h1>Completed</h1>
        <Link className="btn btn-primary" to="/forest">
          Forest
        </Link>
      </header>

      <div className="completed-range">
        <DateRangePicker value={selection} onChange={setSelection} />
      </div>

      {tasks.length === 0 ? (
        <p className="empty-state">
          {hasRangeFilter
            ? 'No completed tasks in this range.'
            : 'No completed tasks yet. Your forest is waiting.'}
        </p>
      ) : (
        <ul className="completed-list" aria-label="Completed tasks">
          {tasks.map((t) => {
            const cat = categoryById(state, t.categoryId);
            const priorLabel =
              (t.priorStatusId && statusById(state, t.priorStatusId)?.name) ?? null;
            return (
              <li key={t.id} className="completed-item">
                <div className="completed-main">
                  <span className="completed-title">{t.title}</span>
                  <span className="completed-meta">
                    {cat?.name ?? 'Uncategorized'}
                    {t.completedAt ? ` · ${formatDate(t.completedAt)}` : ''}
                  </span>
                </div>
                <div className="completed-actions">
                  <label className="completed-restore">
                    <span className="visually-hidden">
                      Restore {t.title} to status
                    </span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        restoreTo(t.id, e.target.value);
                        e.target.value = '';
                      }}
                      aria-label={`Restore ${t.title} to status`}
                    >
                      <option value="" disabled>
                        {priorLabel ? `Restore (was: ${priorLabel})` : 'Restore to…'}
                      </option>
                      {restoreOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn btn-secondary completed-uncomplete"
                    onClick={() => {
                      dispatch({ type: 'uncompleteTask', id: t.id });
                      showToast({ kind: 'info', message: 'Task restored to active list.' });
                    }}
                    title={
                      priorLabel
                        ? `Restore to previous status (${priorLabel})`
                        : 'Restore to active list'
                    }
                  >
                    Un-complete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
