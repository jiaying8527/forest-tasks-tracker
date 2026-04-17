import type { AppState } from './schema';
import { CURRENT_SCHEMA, defaultPrefs } from './schema';

export const SEED_CATEGORY_IDS = {
  taskToDo: 'cat_taskToDo',
  needWait: 'cat_needWait',
  urgent: 'cat_urgent',
} as const;

export const SEED_STATUS_IDS = {
  newStatus: 'sts_new',
  inProgress: 'sts_inProgress',
  completed: 'sts_completed',
} as const;

export function seedState(): AppState {
  return {
    schema: CURRENT_SCHEMA,
    tasks: [],
    categories: [
      { id: SEED_CATEGORY_IDS.taskToDo, name: 'Task To Do', order: 0, isSeeded: true },
      { id: SEED_CATEGORY_IDS.needWait, name: 'Need To Wait', order: 1, isSeeded: true },
      { id: SEED_CATEGORY_IDS.urgent, name: 'Urgent', order: 2, isSeeded: true },
    ],
    statuses: [
      {
        id: SEED_STATUS_IDS.newStatus,
        name: 'New',
        order: 0,
        isSeeded: true,
        isCompleted: false,
        color: '#3b82f6',
      },
      {
        id: SEED_STATUS_IDS.inProgress,
        name: 'In Progress',
        order: 1,
        isSeeded: true,
        isCompleted: false,
        color: '#eab308',
      },
      {
        id: SEED_STATUS_IDS.completed,
        name: 'Completed',
        order: 2,
        isSeeded: true,
        isCompleted: true,
        color: '#22c55e',
      },
    ],
    trees: [],
    prefs: { ...defaultPrefs },
  };
}
