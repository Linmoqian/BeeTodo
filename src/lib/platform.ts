import { invoke } from "@tauri-apps/api/core";
import type { StoredTodo, StudyNote } from "../types";

const TODO_STORAGE_KEY = "beetodo-todos";
const SETTINGS_STORAGE_KEY = "beetodo-settings";
const NOTES_STORAGE_KEY = "beetodo-study-notes";

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
  userName: "工程师",
  petName: "小蜜蜂",
  quickNoteShortcut: "Ctrl+Space",
};

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
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

export function readLocalNotes(): StudyNote[] {
  return readJson<StudyNote[]>(NOTES_STORAGE_KEY, []);
}

export function writeLocalNotes(notes: StudyNote[]): StudyNote[] {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  return notes;
}

export async function getRuntimeTodos(): Promise<StoredTodo[]> {
  if (isTauriRuntime()) {
    return invoke<StoredTodo[]>("list_todos");
  }
  return readLocalTodos();
}

export async function pauseRuntimeTimer(id: string): Promise<StoredTodo[]> {
  if (isTauriRuntime()) {
    return invoke<StoredTodo[]>("pause_timer", { id });
  }
  const now = Date.now();
  return writeLocalTodos(
    readLocalTodos().map((todo) =>
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

export async function getAppSettings(): Promise<AppSettings> {
  if (isTauriRuntime()) {
    return invoke<AppSettings>("get_settings");
  }
  return {
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS),
  };
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
