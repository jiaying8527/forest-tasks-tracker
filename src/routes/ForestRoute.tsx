import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../state/store';
import { ForestScene } from '../components/ForestScene';
import { DateRangePicker } from '../components/DateRangePicker';
import { resolveRange, isInRange, type RangeSelection } from '../lib/dateRange';
import './ForestRoute.css';

export function ForestRoute() {
  const state = useAppState();
  const [selection, setSelection] = useState<RangeSelection>({
    granularity: 'all',
    offset: 0,
  });

  const range = useMemo(() => resolveRange(selection), [selection]);

  const filteredTrees = useMemo(
    () => state.trees.filter((t) => isInRange(t.plantedAt, range)),
    [state.trees, range],
  );

  const count = filteredTrees.length;
  const isAll = selection.granularity === 'all';
  const completedQuery = isAll
    ? ''
    : `?start=${range.start ?? ''}&end=${range.end ?? ''}`;

  return (
    <section className="route-forest">
      <header className="route-header">
        <h1>Your forest</h1>
        <span className="forest-count" aria-label={`${count} trees`}>
          {count} {count === 1 ? 'tree' : 'trees'}
        </span>
      </header>

      <div className="forest-range">
        <DateRangePicker value={selection} onChange={setSelection} />
      </div>

      <div className="forest-scene-wrap">
        <ForestScene trees={filteredTrees} />
        {count === 0 ? (
          <p className="forest-empty-overlay">
            {isAll
              ? 'Complete a task to plant your first tree. Your forest grows with every finish.'
              : 'No trees planted in this range yet.'}
          </p>
        ) : null}
      </div>

      <div className="forest-actions">
        <Link className="btn btn-primary" to={`/completed${completedQuery}`}>
          View completed tasks
        </Link>
      </div>
    </section>
  );
}
