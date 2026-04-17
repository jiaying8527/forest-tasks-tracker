import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppState } from '../state/store';
import { applyFilters } from '../state/selectors';
import { TaskCard } from '../components/TaskCard';
import { FilterBar } from '../components/FilterBar';
import './TasksActiveRoute.css';

export function TasksActiveRoute() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const filters = state.prefs.lastFilters;

  const tasks = useMemo(() => applyFilters(state, filters), [state, filters]);
  const hasAnyActive = useMemo(
    () => state.tasks.some((t) => t.statusId !== completedId(state.statuses)),
    [state.tasks, state.statuses],
  );

  const dismissOnboarding = () =>
    dispatch({ type: 'setOnboardingDismissed', dismissed: true });

  return (
    <section className="route-tasks">
      <header className="route-header">
        <h1>Tasks</h1>
        <Link className="btn btn-primary" to="/task/new" aria-label="Add task">
          + Add task
        </Link>
      </header>

      {!state.prefs.onboardingDismissed ? (
        <div className="onboarding-hint" role="note">
          <p>
            Your tasks live in this browser only. Back them up from{' '}
            <Link to="/settings">Settings</Link>.
          </p>
          <button className="btn btn-ghost" onClick={dismissOnboarding}>
            Got it
          </button>
        </div>
      ) : null}

      <FilterBar />

      {tasks.length === 0 ? (
        <div className="empty-state">
          {hasAnyActive ? (
            <p>No tasks match your filters.</p>
          ) : (
            <>
              <p>Nothing on your list. Add your first task to plant your forest.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="task-list" aria-label="Active tasks">
          {tasks.map((t) => (
            <li key={t.id}>
              <TaskCard task={t} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function completedId(statuses: { id: string; isCompleted: boolean }[]): string {
  return statuses.find((s) => s.isCompleted)?.id ?? '';
}
