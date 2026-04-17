import { useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppState, useStore } from '../state/store';
import './Editor.css';

export function CategoryEditor() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { showToast } = useStore();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; reassignTo: string } | null>(null);

  const sortedCategories = useMemo(
    () => [...state.categories].sort((a, b) => a.order - b.order),
    [state.categories],
  );

  const dragIdRef = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    const current = dragIdRef.current;
    if (!current || current === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overId !== id) setOverId(id);
  };
  const onDrop = (id: string) => (e: React.DragEvent) => {
    const current = dragIdRef.current;
    if (!current || current === id) return;
    e.preventDefault();
    const ids = sortedCategories.map((c) => c.id);
    const from = ids.indexOf(current);
    const to = ids.indexOf(id);
    if (from === -1 || to === -1) return;
    const next = ids.slice();
    next.splice(from, 1);
    next.splice(to, 0, current);
    dispatch({ type: 'reorderCategories', orderedIds: next });
    dragIdRef.current = null;
    setOverId(null);
  };
  const onDragEnd = () => {
    dragIdRef.current = null;
    setOverId(null);
  };

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
        {sortedCategories.map((c) => {
          const usage = state.tasks.filter((t) => t.categoryId === c.id).length;
          const isOver = overId === c.id;
          return (
            <li
              key={c.id}
              className={`editor-row${isOver ? ' is-drop-target' : ''}`}
              onDragOver={onDragOver(c.id)}
              onDrop={onDrop(c.id)}
            >
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
                  <div className="editor-row-main">
                    <span className="editor-name">{c.name}</span>
                    <span className="editor-usage">{usage} tasks</span>
                  </div>
                  <div className="editor-row-actions">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setEditing({ id: c.id, name: c.name })}
                    >
                      Rename
                    </button>
                    <button className="btn btn-ghost" onClick={() => openDelete(c.id)}>
                      Delete
                    </button>
                  </div>
                  <span
                    className="editor-drag-handle"
                    draggable
                    onDragStart={onDragStart(c.id)}
                    onDragEnd={onDragEnd}
                    aria-label={`Reorder ${c.name}`}
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
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
