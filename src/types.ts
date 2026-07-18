export interface StoredTodo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  elapsedMs: number;
  timerStartedAt: number | null;
  color: TodoColor;
}

export interface Todo extends StoredTodo {
  liveMs: number;
}

export type TodoColor =
  | "default"
  | "amber"
  | "rose"
  | "emerald"
  | "sky"
  | "slate";

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}
