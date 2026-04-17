import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task } from '../domain/task';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import { completedStatusId, statusById } from '../state/selectors';
import { bucketDueDate } from '../lib/dates';
import { shouldReduceMotion } from '../lib/reducedMotion';
import './TaskCard.css';

interface Props {
  task: Task;
}

const REVEAL_PX = 88;
const OPEN_THRESHOLD = 32;

export function TaskCard({ task }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const [completing, setCompleting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragging = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragging.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (!dragging.current && Math.abs(dx) > 6) {
      dragging.current = true;
    }
    if (!dragging.current) return;
    const base = revealed ? -REVEAL_PX : 0;
    const next = Math.min(0, Math.max(-REVEAL_PX, base + dx));
    setDragOffset(next);
  };

  const onPointerUp = () => {
    if (dragStartX.current === null) return;
    dragStartX.current = null;
    if (!dragging.current) {
      setDragOffset(0);
      return;
    }
    dragging.current = false;
    const shouldReveal = Math.abs(dragOffset) > OPEN_THRESHOLD;
    setRevealed(shouldReveal);
    setDragOffset(0);
  };

  useEffect(() => {
    if (!revealed) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setRevealed(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, [revealed]);

  const onDelete = () => {
    const snapshot = task;
    setRevealed(false);
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
  };

  const translateX = dragStartX.current !== null && dragging.current
    ? dragOffset
    : revealed
      ? -REVEAL_PX
      : 0;

  return (
    <div
      className={`task-card-swipe${revealed ? ' is-revealed' : ''}${completing ? ' is-completing' : ''}`}
      ref={wrapperRef}
    >
      <button
        type="button"
        className="task-card-delete"
        onClick={onDelete}
        aria-label={`Delete task: ${task.title}`}
        tabIndex={revealed ? 0 : -1}
      >
        Delete
      </button>
      <article
        className={`task-card${completing ? ' is-completing' : ''}`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging.current ? 'none' : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
        <Link to={`/task/${task.id}`} className="task-body" onClick={(e) => {
          if (revealed || dragging.current) {
            e.preventDefault();
            setRevealed(false);
          }
        }}>
          <span className="task-title">{task.title}</span>
          {task.description ? (
            <span className="task-description">{task.description}</span>
          ) : null}
          <span className="task-meta">
            {task.dueDate ? (
              <span className={`chip chip-due chip-due-${bucket}`}>
                {renderDue(task.dueDate, bucket)}
              </span>
            ) : null}
          </span>
        </Link>
        {sts ? (
          <span
            className="chip chip-status task-status-pin"
            style={
              sts.color
                ? { background: sts.color, color: pickReadableInk(sts.color) }
                : undefined
            }
          >
            {sts.name}
          </span>
        ) : null}
      </article>
    </div>
  );
}

function pickReadableInk(hex: string): string {
  const m = hex.replace('#', '');
  const n = m.length === 3
    ? m.split('').map((c) => c + c).join('')
    : m;
  if (n.length !== 6) return '#000';
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1a1a' : '#fff';
}

function renderDue(iso: string, bucket: ReturnType<typeof bucketDueDate>): string {
  if (bucket === 'today') return 'Today';
  if (bucket === 'overdue') return `Overdue · ${iso}`;
  if (bucket === 'thisWeek') return iso;
  return iso;
}
