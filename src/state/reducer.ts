import type { AppState } from '../storage/schema';
import type { Action } from './actions';
import type { Tree } from '../domain/forest';
import { seedForTaskId } from '../domain/forest';
import { newId } from '../lib/id';
import { nowLocalISO } from '../lib/dates';

export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

function completedStatusId(state: AppState): string {
  const s = state.statuses.find((x) => x.isCompleted);
  if (!s) throw new InvariantError('No completed status defined');
  return s.id;
}

function maxOrder(items: { order: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.order), -1);
}

function normalizeName(n: string): string {
  return n.trim();
}

function nameExists(existing: { id: string; name: string }[], name: string, exceptId?: string): boolean {
  const norm = name.trim().toLowerCase();
  return existing.some((x) => x.id !== exceptId && x.name.trim().toLowerCase() === norm);
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addTask': {
      const title = action.title.trim();
      if (!title) throw new InvariantError('Task title must be non-empty');
      if (!state.categories.some((c) => c.id === action.categoryId))
        throw new InvariantError('Unknown categoryId');
      if (!state.statuses.some((s) => s.id === action.statusId))
        throw new InvariantError('Unknown statusId');
      const isCompleted = action.statusId === completedStatusId(state);
      const id = action.id ?? newId();
      const createdAt = action.createdAt ?? nowLocalISO();
      const newTask = {
        id,
        title,
        description: action.description,
        categoryId: action.categoryId,
        statusId: action.statusId,
        createdAt,
        dueDate: action.dueDate,
        completedAt: isCompleted ? createdAt : null,
        priorStatusId: null,
      };
      const trees: Tree[] = isCompleted
        ? [...state.trees, { taskId: id, plantedAt: createdAt, seed: seedForTaskId(id) }]
        : state.trees;
      return { ...state, tasks: [newTask, ...state.tasks], trees };
    }

    case 'updateTask': {
      const idx = state.tasks.findIndex((t) => t.id === action.id);
      if (idx === -1) throw new InvariantError('Unknown task id');
      const existing = state.tasks[idx];
      const patch = action.patch;
      if (patch.title !== undefined && !patch.title.trim())
        throw new InvariantError('Task title must be non-empty');
      if (patch.categoryId !== undefined && !state.categories.some((c) => c.id === patch.categoryId))
        throw new InvariantError('Unknown categoryId');
      if (patch.statusId !== undefined && !state.statuses.some((s) => s.id === patch.statusId))
        throw new InvariantError('Unknown statusId');

      const doneId = completedStatusId(state);
      const wasCompleted = existing.statusId === doneId;
      const willBeCompleted = patch.statusId ? patch.statusId === doneId : wasCompleted;

      let completedAt = existing.completedAt;
      let priorStatusId = existing.priorStatusId;
      let trees = state.trees;

      if (!wasCompleted && willBeCompleted) {
        completedAt = nowLocalISO();
        priorStatusId = existing.statusId;
        trees = [...trees, { taskId: existing.id, plantedAt: completedAt, seed: seedForTaskId(existing.id) }];
      } else if (wasCompleted && !willBeCompleted) {
        completedAt = null;
        priorStatusId = null;
        trees = trees.filter((t) => t.taskId !== existing.id);
      }

      const updated = {
        ...existing,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
        ...(patch.statusId !== undefined ? { statusId: patch.statusId } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
        completedAt,
        priorStatusId,
      };
      const tasks = state.tasks.slice();
      tasks[idx] = updated;
      return { ...state, tasks, trees };
    }

    case 'deleteTask': {
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        trees: state.trees.filter((tr) => tr.taskId !== action.id),
      };
    }

    case 'completeTask': {
      const doneId = completedStatusId(state);
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task) throw new InvariantError('Unknown task id');
      if (task.statusId === doneId) return state;
      const completedAt = action.completedAt ?? nowLocalISO();
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? { ...t, statusId: doneId, priorStatusId: t.statusId, completedAt }
            : t,
        ),
        trees: [
          ...state.trees,
          { taskId: action.id, plantedAt: completedAt, seed: seedForTaskId(action.id) },
        ],
      };
    }

    case 'uncompleteTask': {
      const doneId = completedStatusId(state);
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task) throw new InvariantError('Unknown task id');
      if (task.statusId !== doneId) return state;
      const fallback =
        task.priorStatusId && state.statuses.some((s) => s.id === task.priorStatusId && !s.isCompleted)
          ? task.priorStatusId
          : state.statuses.find((s) => !s.isCompleted)?.id;
      if (!fallback) throw new InvariantError('No non-completed status available to restore');
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, statusId: fallback, priorStatusId: null, completedAt: null } : t,
        ),
        trees: state.trees.filter((tr) => tr.taskId !== action.id),
      };
    }

    case 'addCategory': {
      const name = normalizeName(action.name);
      if (!name) throw new InvariantError('Category name must be non-empty');
      if (nameExists(state.categories, name)) throw new InvariantError('Category name already exists');
      return {
        ...state,
        categories: [
          ...state.categories,
          { id: action.id ?? newId(), name, order: maxOrder(state.categories) + 1, isSeeded: false },
        ],
      };
    }

    case 'renameCategory': {
      const name = normalizeName(action.name);
      if (!name) throw new InvariantError('Category name must be non-empty');
      if (nameExists(state.categories, name, action.id))
        throw new InvariantError('Category name already exists');
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.id ? { ...c, name } : c)),
      };
    }

    case 'deleteCategory': {
      if (!state.categories.some((c) => c.id === action.id))
        throw new InvariantError('Unknown category id');
      if (state.categories.length <= 1)
        throw new InvariantError('At least one category must remain');
      if (!state.categories.some((c) => c.id === action.reassignTo) || action.reassignTo === action.id)
        throw new InvariantError('Invalid reassignTo category');
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        tasks: state.tasks.map((t) =>
          t.categoryId === action.id ? { ...t, categoryId: action.reassignTo } : t,
        ),
      };
    }

    case 'addStatus': {
      const name = normalizeName(action.name);
      if (!name) throw new InvariantError('Status name must be non-empty');
      if (nameExists(state.statuses, name)) throw new InvariantError('Status name already exists');
      return {
        ...state,
        statuses: [
          ...state.statuses,
          {
            id: action.id ?? newId(),
            name,
            order: maxOrder(state.statuses) + 1,
            isSeeded: false,
            isCompleted: false,
          },
        ],
      };
    }

    case 'renameStatus': {
      const name = normalizeName(action.name);
      if (!name) throw new InvariantError('Status name must be non-empty');
      if (nameExists(state.statuses, name, action.id))
        throw new InvariantError('Status name already exists');
      return {
        ...state,
        statuses: state.statuses.map((s) => (s.id === action.id ? { ...s, name } : s)),
      };
    }

    case 'deleteStatus': {
      const target = state.statuses.find((s) => s.id === action.id);
      if (!target) throw new InvariantError('Unknown status id');
      if (state.statuses.length <= 1)
        throw new InvariantError('At least one status must remain');
      if (!state.statuses.some((s) => s.id === action.reassignTo) || action.reassignTo === action.id)
        throw new InvariantError('Invalid reassignTo status');

      let statuses = state.statuses;

      if (target.isCompleted) {
        const newDone = action.newCompletedStatusId;
        if (!newDone || newDone === action.id)
          throw new InvariantError('Must designate a replacement completed status');
        if (!state.statuses.some((s) => s.id === newDone))
          throw new InvariantError('Unknown newCompletedStatusId');
        statuses = statuses.map((s) => ({ ...s, isCompleted: s.id === newDone }));
      }

      return {
        ...state,
        statuses: statuses.filter((s) => s.id !== action.id),
        tasks: state.tasks.map((t) =>
          t.statusId === action.id ? { ...t, statusId: action.reassignTo } : t,
        ),
      };
    }

    case 'setCompletedStatus': {
      if (!state.statuses.some((s) => s.id === action.id))
        throw new InvariantError('Unknown status id');
      return {
        ...state,
        statuses: state.statuses.map((s) => ({ ...s, isCompleted: s.id === action.id })),
      };
    }

    case 'setFilters':
      return { ...state, prefs: { ...state.prefs, lastFilters: action.filters } };

    case 'setSortOrder':
      return { ...state, prefs: { ...state.prefs, sortOrder: action.order } };

    case 'setReducedMotion':
      return { ...state, prefs: { ...state.prefs, reducedMotion: action.pref } };

    case 'setOnboardingDismissed':
      return { ...state, prefs: { ...state.prefs, onboardingDismissed: action.dismissed } };

    case 'setLastExportAt':
      return { ...state, prefs: { ...state.prefs, lastExportAt: action.at } };

    case 'replaceState':
      return action.state;
  }
}
