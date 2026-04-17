import { useState } from 'react';
import type { Category } from '../domain/category';
import type { Status } from '../domain/status';
import './TaskForm.css';

export interface TaskFormValues {
  title: string;
  description: string;
  categoryId: string;
  statusId: string;
  dueDate: string;
}

interface Props {
  initial: TaskFormValues;
  categories: Category[];
  statuses: Status[];
  onSubmit: (v: TaskFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function TaskForm({ initial, categories, statuses, onSubmit, onCancel, onDelete }: Props) {
  const [values, setValues] = useState<TaskFormValues>(initial);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = values.title.trim();
    if (!trimmed) {
      setError('Title is required.');
      return;
    }
    if (trimmed.length > 200) {
      setError('Title is too long (max 200).');
      return;
    }
    if (values.description.length > 5000) {
      setError('Description is too long (max 5000).');
      return;
    }
    setError(null);
    onSubmit({ ...values, title: trimmed });
  };

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <label className="form-field">
        <span>Title</span>
        <input
          type="text"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          autoFocus
          required
          maxLength={200}
        />
      </label>

      <label className="form-field">
        <span>Description</span>
        <textarea
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          maxLength={5000}
        />
      </label>

      <label className="form-field">
        <span>Category</span>
        <select
          value={values.categoryId}
          onChange={(e) => update('categoryId', e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Status</span>
        <select value={values.statusId} onChange={(e) => update('statusId', e.target.value)}>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Due date</span>
        <input
          type="date"
          value={values.dueDate}
          onChange={(e) => update('dueDate', e.target.value)}
        />
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        {onDelete ? (
          <button type="button" className="btn btn-danger form-delete" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
