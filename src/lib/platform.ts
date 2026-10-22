import { invoke } from "@tauri-apps/api/core";
import type { FocusSession, StoredTodo } from "../types";

export { readLocalNotes } from "./notesStore";

const TODO_STORAGE_KEY = "beetodo-todos";
const SETTINGS_STORAGE_KEY = "beetodo-settings";
const FOCUS_SESSIONS_STORAGE_KEY = "beetodo-focus-sessions";

export interface AppSettings {
  alwaysOnTop: boolean;
  compactOpacity: number;
  petEnabled: boolean;
  userName: string;
  petName: string;
  quickNoteShortcut: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  alwaysOnTop: false,
  compactOpacity: 60,
  petEnabled: false,
  userName: "Bee",
  petName: "小蜜蜂",
  quickNoteShortcut: "Ctrl+Space",
};

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export type OsPlatform = "windows" | "macos" | "linux" | "unknown";

export function getOsPlatform(): OsPlatform {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("linux")) return "linux";
  return "unknown";
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readLocalTodos(): StoredTodo[] {
  return readJson<StoredTodo[]>(TODO_STORAGE_KEY, []);
}

export function writeLocalTodos(todos: StoredTodo[]): StoredTodo[] {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  return todos;
}

export function readLocalFocusSessions(): FocusSession[] {
  return readJson<FocusSession[]>(FOCUS_SESSIONS_STORAGE_KEY, []).filter(
    (session) =>
      Number.isFinite(session.startedAt) &&
      Number.isFinite(session.endedAt) &&
      session.endedAt > session.startedAt,
  );
}

export function writeLocalFocusSessions(sessions: FocusSession[]): FocusSession[] {
  localStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  return sessions;
}

export function settleLocalFocusSessions(
  todos: StoredTodo[],
  endedAt: number,
  todoId?: string,
): FocusSession[] {
  const additions = todos
    .filter(
      (todo) =>
        todo.timerStartedAt !== null &&
        todo.timerStartedAt < endedAt &&
        (todoId === undefined || todo.id === todoId),
    )
    .map((todo) => ({ startedAt: todo.timerStartedAt as number, endedAt }));

  if (additions.length === 0) return readLocalFocusSessions();

  const sessions = readLocalFocusSessions();
  additions.forEach((addition) => {
    const exists = sessions.some(
      (session) => session.startedAt === addition.startedAt && session.endedAt === addition.endedAt,
    );
    if (!exists) sessions.push(addition);
  });
  return writeLocalFocusSessions(sessions);
}

export async function getRuntimeTodos(): Promise<StoredTodo[]> {
  if (isTauriRuntime()) {
    return invoke<StoredTodo[]>("list_todos");
  }
  return readLocalTodos();
}

export async function getRuntimeFocusSessions(): Promise<FocusSession[]> {
  if (isTauriRuntime()) {
    return invoke<FocusSession[]>("list_focus_sessions");
  }
  return readLocalFocusSessions();
}

export async function pauseRuntimeTimer(id: string): Promise<StoredTodo[]> {
  if (isTauriRuntime()) {
    return invoke<StoredTodo[]>("pause_timer", { id });
  }
  const now = Date.now();
  const todos = readLocalTodos();
  settleLocalFocusSessions(todos, now, id);
  return writeLocalTodos(
    todos.map((todo) =>
      todo.id === id && todo.timerStartedAt
        ? {
            ...todo,
            elapsedMs: todo.elapsedMs + now - todo.timerStartedAt,
            timerStartedAt: null,
          }
        : todo,
    ),
  );
}

export async function startRuntimeTimer(id: string): Promise<StoredTodo[]> {
  if (isTauriRuntime()) {
    return invoke<StoredTodo[]>("start_timer", { id });
  }
  const startedAt = Date.now();
  const todos = readLocalTodos();
  settleLocalFocusSessions(todos, startedAt);
  return writeLocalTodos(
    todos.map((todo) => {
      const elapsedMs = todo.timerStartedAt
        ? todo.elapsedMs + startedAt - todo.timerStartedAt
        : todo.elapsedMs;
      return {
        ...todo,
        elapsedMs,
        timerStartedAt: todo.id === id && !todo.completed ? startedAt : null,
      };
    }),
  );
}

export async function getAppSettings(): Promise<AppSettings> {
  if (isTauriRuntime()) {
    return invoke<AppSettings>("get_settings");
  }
  const settings = {
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS),
  };
  if (settings.userName === "工程师" || settings.userName === "龚博后") {
    settings.userName = DEFAULT_SETTINGS.userName;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
  return settings;
}

export async function updateAppSettings(
  command: string,
  args: Record<string, unknown>,
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  if (isTauriRuntime()) {
    return invoke<AppSettings>(command, args);
  }
  const settings = { ...(await getAppSettings()), ...patch };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}
