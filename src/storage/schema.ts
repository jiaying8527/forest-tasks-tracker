import type { Task } from '../domain/task';
import type { Category } from '../domain/category';
import type { Status } from '../domain/status';
import type { Tree } from '../domain/forest';

export const CURRENT_SCHEMA = 1 as const;
export const STORAGE_KEY = 'fts.v1';

export type DueBucket = 'today' | 'thisWeek' | 'overdue' | 'later' | 'none';
export type DueFilter = 'hasDue' | DueBucket;
export type SortOrder = 'dueAsc' | 'createdDesc' | 'createdAsc';
export type ReducedMotionPref = 'system' | 'always' | 'never';

export interface Filters {
  categoryId: string | null;
  statusId: string | null;
  dueBucket: DueFilter | null;
}

export interface Preferences {
  lastFilters: Filters;
  sortOrder: SortOrder;
  reducedMotion: ReducedMotionPref;
  lastExportAt: string | null;
  onboardingDismissed: boolean;
}

export interface AppState {
  schema: number;
  tasks: Task[];
  categories: Category[];
  statuses: Status[];
  trees: Tree[];
  prefs: Preferences;
}

export const emptyFilters: Filters = {
  categoryId: null,
  statusId: null,
  dueBucket: null,
};

export const defaultPrefs: Preferences = {
  lastFilters: emptyFilters,
  sortOrder: 'dueAsc',
  reducedMotion: 'system',
  lastExportAt: null,
  onboardingDismissed: false,
};
