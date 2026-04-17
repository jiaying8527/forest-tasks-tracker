import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task } from '../domain/task';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import { categoryById, completedStatusId, statusById } from '../state/selectors';
import { bucketDueDate } from '../lib/dates';
import { shouldReduceMotion } from '../lib/reducedMotion';
import './TaskCard.css';

interface Props {
  task: Task;
}

export function TaskCard({ task }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const [completing, setCompleting] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const cat = categoryById(state, task.categoryId);
  const sts = statusById(state, task.statusId);
  const doneId = completedStatusId(state);
  const bucket = bucketDueDate(task.dueDate, task.statusId === doneId);
  const reduce = shouldReduceMotion(state.prefs.reducedMotion);

  const onComplete = () => {
    if (completing) return;
    setCompleting(true);
    const delay = reduce ? 0 : 360;
    window.setTimeout(() => {
      dispatch({ type: 'completeTask', id: task.id });
    }, delay);
  };

  const onLongPressStart = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      const snapshot = task;
      dispatch({ type: 'deleteTask', id: task.id });
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
    }, 650);
  };

  const onLongPressCancel = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <article
      className={`task-card${completing ? ' is-completing' : ''}`}
      onPointerDown={onLongPressStart}
      onPointerUp={onLongPressCancel}
      onPointerLeave={onLongPressCancel}
      onPointerCancel={onLongPressCancel}
    >
      <button
        className="task-complete"
        onClick={onComplete}
        aria-label={`Complete task: ${task.title}`}
        disabled={completing}
      >
        <span className="task-complete-ring" aria-hidden="true" />
        <span className="task-complete-check" aria-hidden="true">
          ✓
        </span>
      </button>
      <Link to={`/task/${task.id}`} className="task-body">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {cat ? <span className="chip">{cat.name}</span> : null}
          {sts ? <span className="chip chip-status">{sts.name}</span> : null}
          {task.dueDate ? (
            <span className={`chip chip-due chip-due-${bucket}`}>
              {renderDue(task.dueDate, bucket)}
            </span>
          ) : null}
        </span>
      </Link>
    </article>
  );
}

function renderDue(iso: string, bucket: ReturnType<typeof bucketDueDate>): string {
  if (bucket === 'today') return 'Today';
  if (bucket === 'overdue') return `Overdue · ${iso}`;
  if (bucket === 'thisWeek') return iso;
  return iso;
}
