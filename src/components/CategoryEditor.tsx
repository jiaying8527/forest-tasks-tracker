import { useState } from 'react';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import './Editor.css';

export function CategoryEditor() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; reassignTo: string } | null>(null);

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    dispatch({ type: 'addCategory', name });
    setNewName('');
  };

  const rename = () => {
    if (!editing) return;
    dispatch({ type: 'renameCategory', id: editing.id, name: editing.name });
    setEditing(null);
  };

  const openDelete = (id: string) => {
    const fallback = state.categories.find((c) => c.id !== id);
    if (!fallback) {
      showToast({ kind: 'error', message: 'At least one category must remain.' });
      return;
    }
    setPendingDelete({ id, reassignTo: fallback.id });
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    dispatch({
      type: 'deleteCategory',
      id: pendingDelete.id,
      reassignTo: pendingDelete.reassignTo,
    });
    setPendingDelete(null);
  };

  return (
    <div className="editor">
      <ul className="editor-list">
        {state.categories.map((c) => {
          const usage = state.tasks.filter((t) => t.categoryId === c.id).length;
          return (
            <li key={c.id} className="editor-row">
              {editing?.id === c.id ? (
                <>
                  <input
                    className="editor-input"
                    value={editing.name}
                    onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
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
                  <span className="editor-name">{c.name}</span>
                  <span className="editor-usage">{usage} tasks</span>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setEditing({ id: c.id, name: c.name })}
                  >
                    Rename
                  </button>
                  <button className="btn btn-ghost" onClick={() => openDelete(c.id)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="editor-add">
        <input
          className="editor-input"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-primary" onClick={add} disabled={!newName.trim()}>
          Add
        </button>
      </div>

      {pendingDelete ? (
        <div className="editor-confirm" role="dialog" aria-modal="true">
          <p>
            Tasks using this category will be reassigned. Pick a fallback:
          </p>
          <select
            value={pendingDelete.reassignTo}
            onChange={(e) =>
              setPendingDelete({ ...pendingDelete, reassignTo: e.target.value })
            }
          >
            {state.categories
              .filter((c) => c.id !== pendingDelete.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <div className="editor-confirm-actions">
            <button className="btn btn-danger" onClick={confirmDelete}>
              Delete category
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
