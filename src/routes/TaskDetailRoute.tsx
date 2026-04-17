import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import { TaskForm, type TaskFormValues } from '../components/TaskForm';
import { SEED_CATEGORY_IDS, SEED_STATUS_IDS } from '../storage/seed';
import './TaskDetailRoute.css';

export function TaskDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useStore();

  const isNew = id === 'new' || !id;
  const existing = useMemo(
    () => (isNew ? undefined : state.tasks.find((t) => t.id === id)),
    [isNew, id, state.tasks],
  );

  const defaultCategoryId =
    state.categories.find((c) => c.id === SEED_CATEGORY_IDS.taskToDo)?.id ??
    state.categories[0]?.id ??
    '';
  const defaultStatusId =
    state.statuses.find((s) => s.id === SEED_STATUS_IDS.newStatus)?.id ??
    state.statuses.find((s) => !s.isCompleted)?.id ??
    state.statuses[0]?.id ??
    '';

  if (!isNew && !existing) {
    return (
      <section className="route-detail">
        <h1>Task not found</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>
          Back to tasks
        </button>
      </section>
    );
  }

  const initial: TaskFormValues = existing
    ? {
        title: existing.title,
        description: existing.description ?? '',
        categoryId: existing.categoryId,
        statusId: existing.statusId,
        dueDate: existing.dueDate ?? '',
      }
    : {
        title: '',
        description: '',
        categoryId: defaultCategoryId,
        statusId: defaultStatusId,
        dueDate: '',
      };

  const onSubmit = (v: TaskFormValues) => {
    if (existing) {
      dispatch({
        type: 'updateTask',
        id: existing.id,
        patch: {
          title: v.title,
          description: v.description || null,
          categoryId: v.categoryId,
          statusId: v.statusId,
          dueDate: v.dueDate || null,
        },
      });
    } else {
      dispatch({
        type: 'addTask',
        title: v.title,
        description: v.description || null,
        categoryId: v.categoryId,
        statusId: v.statusId,
        dueDate: v.dueDate || null,
      });
    }
    navigate('/tasks');
  };

  const onDelete = () => {
    if (!existing) return;
    const snapshot = existing;
    dispatch({ type: 'deleteTask', id: existing.id });
    showToast({
      kind: 'info',
      message: 'Task deleted',
      actionLabel: 'Undo',
      onAction: () => {
        dispatch({
          type: 'addTask',
          title: snapshot.title,
          description: snapshot.description,
          categoryId: snapshot.categoryId,
          statusId: snapshot.statusId,
          dueDate: snapshot.dueDate,
          id: snapshot.id,
          createdAt: snapshot.createdAt,
        });
      },
    });
    navigate('/tasks');
  };

  return (
    <section className="route-detail">
      <header className="route-header">
        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          ← Back
        </button>
        <h1>{existing ? 'Edit task' : 'New task'}</h1>
      </header>

      <TaskForm
        initial={initial}
        categories={state.categories}
        statuses={state.statuses}
        onSubmit={onSubmit}
        onCancel={() => navigate(-1)}
        onDelete={existing ? onDelete : undefined}
      />
    </section>
  );
}
