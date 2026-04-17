import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import { completedTasks, categoryById, statusById } from '../state/selectors';
import './TasksCompletedRoute.css';

export function TasksCompletedRoute() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const tasks = completedTasks(state);

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

  return (
    <section className="route-completed">
      <header className="route-header">
        <h1>Completed</h1>
        <Link className="btn btn-primary" to="/tasks">
          Active
        </Link>
      </header>

      {tasks.length === 0 ? (
        <p className="empty-state">No completed tasks yet. Your forest is waiting.</p>
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
