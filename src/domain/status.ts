export type StatusId = string;

export interface Status {
  id: StatusId;
  name: string;
  order: number;
  isSeeded: boolean;
  isCompleted: boolean;
  color?: string;
}
