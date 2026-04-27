export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  elapsedMs: number;
  timerStartedAt: number | null;
  liveMs: number;
}
