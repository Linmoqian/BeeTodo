export interface StoredTodo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  elapsedMs: number;
  timerStartedAt: number | null;
}

export interface Todo extends StoredTodo {
  liveMs: number;
}
