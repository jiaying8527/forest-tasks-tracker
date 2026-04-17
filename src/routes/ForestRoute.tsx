import { useAppState } from '../state/store';
import { ForestScene } from '../components/ForestScene';
import './ForestRoute.css';

export function ForestRoute() {
  const state = useAppState();
  const count = state.trees.length;

  return (
    <section className="route-forest">
      <header className="route-header">
        <h1>Your forest</h1>
        <span className="forest-count" aria-label={`${count} trees`}>
          {count} {count === 1 ? 'tree' : 'trees'}
        </span>
      </header>

      {count === 0 ? (
        <p className="empty-state">
          Complete a task to plant your first tree. Your forest grows with every finish.
        </p>
      ) : null}

      <ForestScene trees={state.trees} />
    </section>
  );
}
