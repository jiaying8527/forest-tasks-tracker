import { useState } from 'react';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import './Editor.css';

export function StatusEditor() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    reassignTo: string;
    newCompletedStatusId?: string;
  } | null>(null);

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    dispatch({ type: 'addStatus', name });
    setNewName('');
  };

  const rename = () => {
    if (!editing) return;
    dispatch({ type: 'renameStatus', id: editing.id, name: editing.name });
    setEditing(null);
  };

  const openDelete = (id: string) => {
    const fallback = state.statuses.find((s) => s.id !== id);
    if (!fallback) {
      showToast({ kind: 'error', message: 'At least one status must remain.' });
      return;
    }
    const target = state.statuses.find((s) => s.id === id);
    const newCompletedStatusId = target?.isCompleted
      ? state.statuses.find((s) => s.id !== id)?.id
      : undefined;
    setPendingDelete({ id, reassignTo: fallback.id, newCompletedStatusId });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    dispatch({
      type: 'deleteStatus',
      id: pendingDelete.id,
      reassignTo: pendingDelete.reassignTo,
      newCompletedStatusId: pendingDelete.newCompletedStatusId,
    });
    setPendingDelete(null);
  };

  const pendingTarget = pendingDelete
    ? state.statuses.find((s) => s.id === pendingDelete.id)
    : undefined;

  return (
    <div className="editor">
      <ul className="editor-list">
        {state.statuses.map((s) => {
          const usage = state.tasks.filter((t) => t.statusId === s.id).length;
          return (
            <li key={s.id} className="editor-row">
              {editing?.id === s.id ? (
                <>
                  <input
                    className="editor-input"
                    value={editing.name}
                    onChange={(e) => setEditing({ id: s.id, name: e.target.value })}
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={rename}>
                    Save
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <label
                    className="editor-color"
                    style={{ background: s.color ?? '#94a3b8' }}
                    aria-label={`Color for ${s.name}`}
                  >
                    <input
                      type="color"
                      value={s.color ?? '#94a3b8'}
                      onChange={(e) =>
                        dispatch({ type: 'setStatusColor', id: s.id, color: e.target.value })
                      }
                    />
                  </label>
                  <div className="editor-row-main">
                    <span className="editor-name">{s.name}</span>
                    <span className="editor-usage">{usage} tasks</span>
                  </div>
                  <div className="editor-row-actions">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setEditing({ id: s.id, name: s.name })}
                    >
                      Rename
                    </button>
                    <button className="btn btn-ghost" onClick={() => openDelete(s.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="editor-add">
        <input
          className="editor-input"
          placeholder="New status name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-primary" onClick={add} disabled={!newName.trim()}>
          Add
        </button>
      </div>

      {pendingDelete && pendingTarget ? (
        <div className="editor-confirm" role="dialog" aria-modal="true">
          <p>Tasks using this status will be reassigned. Pick a fallback:</p>
          <select
            value={pendingDelete.reassignTo}
            onChange={(e) =>
              setPendingDelete({ ...pendingDelete, reassignTo: e.target.value })
            }
          >
            {state.statuses
              .filter((s) => s.id !== pendingDelete.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {pendingTarget.isCompleted ? (
            <>
              <p>
                This is your completed status. Pick a replacement so the forest knows which
                status plants trees:
              </p>
              <select
                value={pendingDelete.newCompletedStatusId ?? ''}
                onChange={(e) =>
                  setPendingDelete({
                    ...pendingDelete,
                    newCompletedStatusId: e.target.value || undefined,
                  })
                }
              >
                {state.statuses
                  .filter((s) => s.id !== pendingDelete.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </>
          ) : null}

          <div className="editor-confirm-actions">
            <button
              className="btn btn-danger"
              onClick={confirmDelete}
              disabled={
                pendingTarget.isCompleted &&
                (!pendingDelete.newCompletedStatusId ||
                  pendingDelete.newCompletedStatusId === pendingDelete.id)
              }
            >
              Delete status
            </button>
            <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
