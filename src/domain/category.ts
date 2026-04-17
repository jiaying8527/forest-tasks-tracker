export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  order: number;
  isSeeded: boolean;
}
