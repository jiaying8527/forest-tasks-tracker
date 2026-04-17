import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppState } from '../state/store';
import { applyFilters } from '../state/selectors';
import { TaskCard } from '../components/TaskCard';
import { FilterBar } from '../components/FilterBar';
import { CategoryTabs, type CategoryTabValue } from '../components/CategoryTabs';
import type { Category } from '../domain/category';
import type { Task } from '../domain/task';
import './TasksActiveRoute.css';

interface DraggableListProps {
  tasks: Task[];
  ariaLabel: string;
  enabled: boolean;
  onReorder: (orderedIds: string[]) => void;
}

function DraggableList({ tasks, ariaLabel, enabled, onReorder }: DraggableListProps) {
  const dragIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const findRowIdAt = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el || !listRef.current) return null;
    const li = (el as HTMLElement).closest('li[data-task-id]') as HTMLElement | null;
    if (!li || !listRef.current.contains(li)) return null;
    return li.dataset.taskId ?? null;
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (!enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragIdRef.current = id;
    setDragId(id);
    setOverId(id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragIdRef.current) return;
    e.preventDefault();
    const overRowId = findRowIdAt(e.clientX, e.clientY);
    if (overRowId && overRowId !== overId) {
      setOverId(overRowId);
    }
  };

  const finishDrag = () => {
    const current = dragIdRef.current;
    const target = overId;
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
    if (!current || !target || current === target) return;
    const ids = tasks.map((t) => t.id);
    const from = ids.indexOf(current);
    const to = ids.indexOf(target);
    if (from === -1 || to === -1) return;
    const next = ids.slice();
    next.splice(from, 1);
    next.splice(to, 0, current);
    onReorder(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragIdRef.current) return;
    e.preventDefault();
    finishDrag();
  };

  return (
    <ol
      ref={listRef}
      className="task-list task-list-numbered"
      aria-label={ariaLabel}
    >
      {tasks.map((t) => (
        <li
          key={t.id}
          data-task-id={t.id}
          className={
            (dragId === t.id ? 'is-dragging ' : '') +
            (overId === t.id && dragId !== t.id ? 'is-drop-target' : '')
          }
        >
          <TaskCard
            task={t}
            dragHandle={
              enabled ? (
                <span
                  className="task-drag-handle"
                  onPointerDown={onPointerDown(t.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  aria-label={`Reorder ${t.title}`}
                  title="Drag to reorder"
                >
                  ⋮⋮
                </span>
              ) : null
            }
          />
        </li>
      ))}
    </ol>
  );
}

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
        <Link className="btn btn-primary btn-add-task" to="/task/new" aria-label="Add task">
          <span className="btn-add-task-plus" aria-hidden="true">+</span>
          <span>Add task</span>
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
            <p>Nothing on your list. Add task to plant your forest.</p>
          )}
        </div>
      ) : activeTab === 'all' ? (
        <div className="task-groups">
          {groups.map(({ category, items }) => (
            <section key={category.id} className="task-group">
              <h2 className="task-group-title">{category.name}</h2>
              <DraggableList
                tasks={items}
                ariaLabel={category.name}
                enabled={state.prefs.sortOrder === 'manual'}
                onReorder={(orderedIds) =>
                  dispatch({ type: 'reorderTasks', orderedIds })
                }
              />
            </section>
          ))}
        </div>
      ) : (
        <DraggableList
          tasks={tasks}
          ariaLabel="Active tasks"
          enabled={state.prefs.sortOrder === 'manual'}
          onReorder={(orderedIds) =>
            dispatch({ type: 'reorderTasks', orderedIds })
          }
        />
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
