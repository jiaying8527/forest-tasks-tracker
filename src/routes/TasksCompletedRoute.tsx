import { Link } from 'react-router-dom';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import { completedTasks, categoryById } from '../state/selectors';
import './TasksCompletedRoute.css';

export function TasksCompletedRoute() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const tasks = completedTasks(state);

  return (
    <section className="route-completed">
      <header className="route-header">
        <h1>Completed</h1>
        <Link className="btn btn-secondary" to="/tasks">
          Active
        </Link>
      </header>

      {tasks.length === 0 ? (
        <p className="empty-state">No completed tasks yet. Your forest is waiting.</p>
      ) : (
        <ul className="completed-list" aria-label="Completed tasks">
          {tasks.map((t) => {
            const cat = categoryById(state, t.categoryId);
            return (
              <li key={t.id} className="completed-item">
                <div className="completed-main">
                  <span className="completed-title">{t.title}</span>
                  <span className="completed-meta">
                    {cat?.name ?? 'Uncategorized'}
                    {t.completedAt ? ` · ${formatDate(t.completedAt)}` : ''}
                  </span>
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    dispatch({ type: 'uncompleteTask', id: t.id });
                    showToast({ kind: 'info', message: 'Task restored to active list.' });
                  }}
                >
                  Un-complete
                </button>
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
