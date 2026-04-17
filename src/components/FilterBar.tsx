import type { DueFilter, SortOrder } from '../storage/schema';
import { useAppDispatch, useAppState } from '../state/store';
import './FilterBar.css';

const dueOptions: { id: DueFilter; label: string }[] = [
  { id: 'hasDue', label: 'Has due date' },
  { id: 'none', label: 'No due date' },
  { id: 'overdue', label: 'Overdue' },
];

const sortOptions: { id: SortOrder; label: string }[] = [
  { id: 'dueAsc', label: 'Due soon' },
  { id: 'createdDesc', label: 'Newest' },
  { id: 'createdAsc', label: 'Oldest' },
];

export function FilterBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const filters = state.prefs.lastFilters;
  const sortOrder = state.prefs.sortOrder;
  const nonCompletedStatuses = state.statuses.filter((s) => !s.isCompleted);

  const setStatus = (statusId: string | null) =>
    dispatch({ type: 'setFilters', filters: { ...filters, statusId } });
  const setDue = (dueBucket: DueFilter | null) =>
    dispatch({ type: 'setFilters', filters: { ...filters, dueBucket } });
  const setSort = (order: SortOrder) => dispatch({ type: 'setSortOrder', order });

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
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {nonCompletedStatuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        <span className="visually-hidden">Due</span>
        <select
          value={filters.dueBucket ?? ''}
          onChange={(e) => setDue((e.target.value as DueFilter) || null)}
          aria-label="Filter by due date"
        >
          <option value="">Any due date</option>
          {dueOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select filter-sort">
        <span className="visually-hidden">Sort order</span>
        <svg
          className="filter-sort-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          width="14"
          height="14"
        >
          <path
            d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <select
          value={sortOrder}
          onChange={(e) => setSort(e.target.value as SortOrder)}
          aria-label="Sort order"
        >
          {sortOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {hasAny ? (
        <button className="btn btn-ghost filter-clear" onClick={clearAll}>
          Clear
        </button>
      ) : null}
    </div>
  );
}
