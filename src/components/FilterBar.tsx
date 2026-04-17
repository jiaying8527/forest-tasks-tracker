import type { DueBucket } from '../storage/schema';
import { useAppDispatch, useAppState } from '../state/store';
import './FilterBar.css';

const dueOptions: { id: DueBucket; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'none', label: 'No due date' },
];

export function FilterBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const filters = state.prefs.lastFilters;
  const nonCompletedStatuses = state.statuses.filter((s) => !s.isCompleted);

  const setStatus = (statusId: string | null) =>
    dispatch({ type: 'setFilters', filters: { ...filters, statusId } });
  const setDue = (dueBucket: DueBucket | null) =>
    dispatch({ type: 'setFilters', filters: { ...filters, dueBucket } });

  const hasAny = filters.statusId || filters.dueBucket;
  const clearAll = () =>
    dispatch({
      type: 'setFilters',
      filters: { ...filters, statusId: null, dueBucket: null },
    });

  return (
    <div className="filter-bar" role="toolbar" aria-label="Filters">
      <label className="filter-select">
        <span className="visually-hidden">Status</span>
        <select
          value={filters.statusId ?? ''}
          onChange={(e) => setStatus(e.target.value || null)}
        >
          <option value="">All statuses</option>
          {nonCompletedStatuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="filter-chips">
        {dueOptions.map((opt) => (
          <button
            key={opt.id}
            className={`filter-chip${filters.dueBucket === opt.id ? ' is-active' : ''}`}
            onClick={() => setDue(filters.dueBucket === opt.id ? null : opt.id)}
            aria-pressed={filters.dueBucket === opt.id}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hasAny ? (
        <button className="btn btn-ghost filter-clear" onClick={clearAll}>
          Clear
        </button>
      ) : null}
    </div>
  );
}
