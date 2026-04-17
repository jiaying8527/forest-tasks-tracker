import type { AppState, Filters } from '../storage/schema';
import type { Task } from '../domain/task';
import { bucketDueDate } from '../lib/dates';

export function completedStatusId(state: AppState): string {
  const s = state.statuses.find((x) => x.isCompleted);
  if (!s) throw new Error('No completed status defined');
  return s.id;
}

export function activeTasks(state: AppState): Task[] {
  const done = completedStatusId(state);
  return state.tasks
    .filter((t) => t.statusId !== done)
    .slice()
    .sort((a, b) => {
      // dueDate ASC nulls-last, then createdAt DESC
      const ad = a.dueDate ?? '';
      const bd = b.dueDate ?? '';
      if (ad && bd) {
        if (ad !== bd) return ad < bd ? -1 : 1;
      } else if (ad !== bd) {
        return ad ? -1 : 1;
      }
      return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
    });
}

export function completedTasks(state: AppState): Task[] {
  const done = completedStatusId(state);
  return state.tasks
    .filter((t) => t.statusId === done)
    .slice()
    .sort((a, b) => {
      const ac = a.completedAt ?? '';
      const bc = b.completedAt ?? '';
      return ac < bc ? 1 : ac > bc ? -1 : 0;
    });
}

export function applyFilters(state: AppState, filters: Filters, now: Date = new Date()): Task[] {
  const done = completedStatusId(state);
  return activeTasks(state).filter((t) => {
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters.statusId && t.statusId !== filters.statusId) return false;
    if (filters.dueBucket) {
      const bucket = bucketDueDate(t.dueDate, t.statusId === done, now);
      if (bucket !== filters.dueBucket) return false;
    }
    return true;
  });
}

export function forestTrees(state: AppState) {
  return state.trees;
}

export function categoryById(state: AppState, id: string) {
  return state.categories.find((c) => c.id === id);
}

export function statusById(state: AppState, id: string) {
  return state.statuses.find((s) => s.id === id);
}
