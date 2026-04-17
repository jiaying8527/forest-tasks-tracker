import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppState } from '../state/store';
import { applyFilters } from '../state/selectors';
import { TaskCard } from '../components/TaskCard';
import { FilterBar } from '../components/FilterBar';
import { CategoryTabs, type CategoryTabValue } from '../components/CategoryTabs';
import type { Category } from '../domain/category';
import type { Task } from '../domain/task';
import './TasksActiveRoute.css';

export function TasksActiveRoute() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const filters = state.prefs.lastFilters;
  const [activeTab, setActiveTab] = useState<CategoryTabValue>('all');

  const filtersForView = useMemo(
    () => ({
      ...filters,
      categoryId: activeTab === 'all' ? null : activeTab,
    }),
    [filters, activeTab],
  );

  const tasks = useMemo(
    () => applyFilters(state, filtersForView),
    [state, filtersForView],
  );
  const hasAnyActive = useMemo(
    () => state.tasks.some((t) => t.statusId !== completedId(state.statuses)),
    [state.tasks, state.statuses],
  );

  const sortedCategories = useMemo(
    () => [...state.categories].sort((a, b) => a.order - b.order),
    [state.categories],
  );

  const groups = useMemo(
    () => (activeTab === 'all' ? groupByCategory(tasks, sortedCategories) : []),
    [activeTab, tasks, sortedCategories],
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

      <CategoryTabs
        categories={state.categories}
        value={activeTab}
        onChange={setActiveTab}
      />

      <FilterBar />

      {tasks.length === 0 ? (
        <div className="empty-state">
          {hasAnyActive ? (
            <p>No tasks match your filters.</p>
          ) : (
            <p>Nothing on your list. Add your first task to plant your forest.</p>
          )}
        </div>
      ) : activeTab === 'all' ? (
        <div className="task-groups">
          {groups.map(({ category, items }) => (
            <section key={category.id} className="task-group">
              <h2 className="task-group-title">{category.name}</h2>
              <ol className="task-list task-list-numbered" aria-label={category.name}>
                {items.map((t) => (
                  <li key={t.id}>
                    <TaskCard task={t} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <ol className="task-list task-list-numbered" aria-label="Active tasks">
          {tasks.map((t) => (
            <li key={t.id}>
              <TaskCard task={t} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function completedId(statuses: { id: string; isCompleted: boolean }[]): string {
  return statuses.find((s) => s.isCompleted)?.id ?? '';
}

function groupByCategory(
  tasks: Task[],
  categories: Category[],
): { category: Category; items: Task[] }[] {
  const buckets = new Map<string, Task[]>();
  for (const t of tasks) {
    const arr = buckets.get(t.categoryId) ?? [];
    arr.push(t);
    buckets.set(t.categoryId, arr);
  }
  return categories
    .map((c) => ({ category: c, items: buckets.get(c.id) ?? [] }))
    .filter((g) => g.items.length > 0);
}
