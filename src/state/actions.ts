import type { AppState, Filters, ReducedMotionPref, SortOrder } from '../storage/schema';

export type Action =
  | { type: 'addTask'; title: string; description: string | null; categoryId: string; statusId: string; dueDate: string | null; id?: string; createdAt?: string }
  | { type: 'updateTask'; id: string; patch: Partial<{ title: string; description: string | null; categoryId: string; statusId: string; dueDate: string | null }> }
  | { type: 'deleteTask'; id: string }
  | { type: 'completeTask'; id: string; completedAt?: string }
  | { type: 'uncompleteTask'; id: string }
  | { type: 'addCategory'; name: string; id?: string }
  | { type: 'renameCategory'; id: string; name: string }
  | { type: 'deleteCategory'; id: string; reassignTo: string }
  | { type: 'addStatus'; name: string; id?: string }
  | { type: 'renameStatus'; id: string; name: string }
  | { type: 'deleteStatus'; id: string; reassignTo: string; newCompletedStatusId?: string }
  | { type: 'setCompletedStatus'; id: string }
  | { type: 'setFilters'; filters: Filters }
  | { type: 'setSortOrder'; order: SortOrder }
  | { type: 'setReducedMotion'; pref: ReducedMotionPref }
  | { type: 'setOnboardingDismissed'; dismissed: boolean }
  | { type: 'setLastExportAt'; at: string }
  | { type: 'replaceState'; state: AppState };
