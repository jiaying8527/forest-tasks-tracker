import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../domain/task';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import { completedStatusId, statusById } from '../state/selectors';
import { bucketDueDate } from '../lib/dates';
import './TaskCard.css';

interface Props {
  task: Task;
  dragHandle?: React.ReactNode;
}

const REVEAL_PX = 168;
const OPEN_THRESHOLD = 48;

export function TaskCard({ task, dragHandle }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragging = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descDraft, setDescDraft] = useState(task.description ?? '');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const statusButtonRef = useRef<HTMLButtonElement | null>(null);
  const statusPopoverRef = useRef<HTMLUListElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!statusPickerOpen) {
      setPopoverPos(null);
      return;
    }
    const btn = statusButtonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setPopoverPos({ top: r.bottom + 6, left: Math.max(8, r.right - 200) });
  }, [statusPickerOpen]);

  useEffect(() => {
    if (!statusPickerOpen) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (statusButtonRef.current?.contains(t)) return;
      if (statusPopoverRef.current?.contains(t)) return;
      setStatusPickerOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [statusPickerOpen]);

  const sts = statusById(state, task.statusId);
  const doneId = completedStatusId(state);
  const bucket = bucketDueDate(task.dueDate, task.statusId === doneId);

  const startEditing = () => {
    setTitleDraft(task.title);
    setDescDraft(task.description ?? '');
    setEditing(true);
    setRevealed(false);
  };

  const saveEdits = () => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setEditing(false);
      return;
    }
    const patch: { title?: string; description?: string | null } = {};
    if (nextTitle !== task.title) patch.title = nextTitle;
    const nextDesc = descDraft.trim();
    const currentDesc = task.description ?? '';
    if (nextDesc !== currentDesc) patch.description = nextDesc === '' ? null : nextDesc;
    if (Object.keys(patch).length > 0) {
      dispatch({ type: 'updateTask', id: task.id, patch });
    }
    setEditing(false);
  };

  const cancelEdits = () => {
    setEditing(false);
  };

  const pickStatus = (statusId: string) => {
    if (statusId !== task.statusId) {
      dispatch({ type: 'updateTask', id: task.id, patch: { statusId } });
    }
    setStatusPickerOpen(false);
  };

  const onComplete = () => {
    if (completing) return;
    setCompleting(true);
    dispatch({ type: 'completeTask', id: task.id });
    showToast({
      kind: 'success',
      message: 'Task completed — a tree was planted.',
      actionLabel: 'Undo',
      onAction: () => {
        dispatch({ type: 'uncompleteTask', id: task.id });
      },
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return;
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

  useEffect(() => {
    if (!editing) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        saveEdits();
      }
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  });

  const onDelete = () => {
    const snapshot = task;
    setRevealed(false);
    dispatch({ type: 'deleteTask', id: task.id });
    showToast({
      kind: 'error',
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

  const translateX = editing
    ? 0
    : dragStartX.current !== null && dragging.current
      ? dragOffset
      : revealed
        ? -REVEAL_PX
        : 0;

  return (
    <div
      className={
        'task-card-swipe' +
        (revealed ? ' is-revealed' : '') +
        (completing ? ' is-completing' : '') +
        (editing ? ' is-editing' : '')
      }
      ref={wrapperRef}
    >
      <div className="task-card-actions">
        <button
          type="button"
          className="task-card-edit"
          onClick={startEditing}
          aria-label={`Edit task: ${task.title}`}
          tabIndex={revealed ? 0 : -1}
        >
          Edit
        </button>
        <button
          type="button"
          className="task-card-delete"
          onClick={onDelete}
          aria-label={`Delete task: ${task.title}`}
          tabIndex={revealed ? 0 : -1}
        >
          Delete
        </button>
      </div>
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
          disabled={completing || editing}
        >
          <span className="task-complete-ring" aria-hidden="true" />
          <span className="task-complete-check" aria-hidden="true">
            ✓
          </span>
        </button>

        {editing ? (
          <div className="task-body task-body-edit">
            <input
              className="task-title-inline"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveEdits();
                } else if (e.key === 'Escape') {
                  cancelEdits();
                }
              }}
              placeholder="Task title"
            />
            <textarea
              className="task-description-inline"
              value={descDraft}
              rows={1}
              onChange={(e) => {
                setDescDraft(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveEdits();
                } else if (e.key === 'Escape') {
                  cancelEdits();
                }
              }}
              placeholder="Add description"
            />
          </div>
        ) : (
          <div
            className="task-body"
            onClick={(e) => {
              if (revealed || dragging.current) {
                e.preventDefault();
                setRevealed(false);
                return;
              }
              navigate(`/task/${task.id}`);
            }}
          >
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
          </div>
        )}

        {sts || dragHandle ? (
          <div className="task-right-cluster">
            {sts ? (
              <button
                ref={statusButtonRef}
                type="button"
                className="chip chip-status chip-status-button"
                style={
                  sts.color
                    ? { background: sts.color, color: pickReadableInk(sts.color) }
                    : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusPickerOpen((v) => !v);
                }}
                aria-haspopup="listbox"
                aria-expanded={statusPickerOpen}
              >
                {sts.name}
              </button>
            ) : null}
            {!editing ? dragHandle : null}
          </div>
        ) : null}
      </article>
      {statusPickerOpen && popoverPos
        ? createPortal(
            <ul
              ref={statusPopoverRef}
              className="status-popover"
              role="listbox"
              style={{ top: popoverPos.top, left: popoverPos.left }}
            >
              {state.statuses.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={
                      'status-popover-item' +
                      (s.id === task.statusId ? ' is-active' : '')
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      pickStatus(s.id);
                    }}
                  >
                    <span
                      className="status-popover-swatch"
                      style={{ background: s.color ?? '#94a3b8' }}
                    />
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
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
