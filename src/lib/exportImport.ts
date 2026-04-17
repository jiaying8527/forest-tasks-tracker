import type { AppState } from '../storage/schema';
import { CURRENT_SCHEMA } from '../storage/schema';

export const EXPORT_APP_TAG = 'forest-tasks-tracker';

export interface ExportEnvelope {
  app: typeof EXPORT_APP_TAG;
  schema: number;
  exportedAt: string;
  state: AppState;
}

export function exportEnvelope(state: AppState): ExportEnvelope {
  return {
    app: EXPORT_APP_TAG,
    schema: CURRENT_SCHEMA,
    exportedAt: new Date().toISOString(),
    state,
  };
}

export function exportToBlob(state: AppState): Blob {
  const env = exportEnvelope(state);
  return new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; state: AppState }
  | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not a valid JSON file.' };
  }
  return validateEnvelope(data);
}

export function validateEnvelope(data: unknown): ImportResult {
  if (!data || typeof data !== 'object')
    return { ok: false, error: 'File is empty or malformed.' };
  const env = data as Partial<ExportEnvelope>;
  if (env.app !== EXPORT_APP_TAG)
    return { ok: false, error: 'This file is not a Forest Tasks Tracker export.' };
  if (typeof env.schema !== 'number')
    return { ok: false, error: 'Missing schema version.' };
  if (env.schema > CURRENT_SCHEMA)
    return { ok: false, error: 'This file was created by a newer version. Update the app first.' };
  if (!env.state || typeof env.state !== 'object')
    return { ok: false, error: 'Missing state.' };

  const integrity = checkIntegrity(env.state as AppState);
  if (!integrity.ok) return integrity;

  return { ok: true, state: env.state as AppState };
}

function checkIntegrity(state: AppState): ImportResult {
  if (!Array.isArray(state.tasks) || !Array.isArray(state.categories) ||
      !Array.isArray(state.statuses) || !Array.isArray(state.trees))
    return { ok: false, error: 'State shape is malformed.' };

  if (state.categories.length === 0)
    return { ok: false, error: 'At least one category is required.' };
  if (state.statuses.length === 0)
    return { ok: false, error: 'At least one status is required.' };

  const completed = state.statuses.filter((s) => s.isCompleted);
  if (completed.length !== 1)
    return { ok: false, error: 'Exactly one status must be marked as the completed status.' };

  const categoryIds = new Set(state.categories.map((c) => c.id));
  const statusIds = new Set(state.statuses.map((s) => s.id));
  const taskIds = new Set(state.tasks.map((t) => t.id));
  const completedStatusId = completed[0].id;
  const completedTaskIds = new Set(
    state.tasks.filter((t) => t.statusId === completedStatusId).map((t) => t.id),
  );

  for (const t of state.tasks) {
    if (!categoryIds.has(t.categoryId))
      return { ok: false, error: `Task "${t.title}" references unknown category.` };
    if (!statusIds.has(t.statusId))
      return { ok: false, error: `Task "${t.title}" references unknown status.` };
  }
  for (const tree of state.trees) {
    if (!taskIds.has(tree.taskId))
      return { ok: false, error: 'Forest references a task that does not exist.' };
    if (!completedTaskIds.has(tree.taskId))
      return { ok: false, error: 'Forest references a task that is not marked completed.' };
  }

  return { ok: true, state };
}
