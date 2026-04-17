import type { CategoryId } from './category';
import type { StatusId } from './status';

export type TaskId = string;

export interface Task {
  id: TaskId;
  title: string;
  description: string | null;
  categoryId: CategoryId;
  statusId: StatusId;
  createdAt: string; // ISO-8601 local time
  dueDate: string | null; // YYYY-MM-DD
  completedAt: string | null;
  priorStatusId: StatusId | null;
  order?: number;
}
