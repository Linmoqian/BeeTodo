import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  isTauriRuntime,
  readLocalTodos,
  writeLocalTodos,
} from "../lib/platform";
import type { StoredTodo, TodoColor } from "../types";

type TodoUpdater = (todos: StoredTodo[]) => StoredTodo[];

export function useTodos() {
  const [todos, setTodos] = useState<StoredTodo[]>(() =>
    isTauriRuntime() ? [] : readLocalTodos(),
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void invoke<StoredTodo[]>("list_todos")
      .then(setTodos)
      .catch((error) => console.error("Failed to load todos", error));
  }, []);

  useEffect(() => {
    if (isTauriRuntime()) return;
    const syncTodos = () => setTodos(readLocalTodos());
    window.addEventListener("storage", syncTodos);
    return () => window.removeEventListener("storage", syncTodos);
  }, []);

  const updateLocal = useCallback((updater: TodoUpdater) => {
    setTodos((current) => writeLocalTodos(updater(current)));
  }, []);

  const runCommand = useCallback(
    async (command: string, args: Record<string, unknown>, updater: TodoUpdater) => {
      if (isTauriRuntime()) {
        setTodos(await invoke<StoredTodo[]>(command, args));
        return;
      }
      updateLocal(updater);
    },
    [updateLocal],
  );

  const addTodo = useCallback(
    (text: string) =>
      runCommand("add_todo", { text }, (current) => [
        {
          id: crypto.randomUUID(),
          text,
          completed: false,
          createdAt: Date.now(),
          elapsedMs: 0,
          timerStartedAt: null,
          color: "default",
        },
        ...current,
      ]),
    [runCommand],
  );

  const removeTodo = useCallback(
    (id: string) =>
      runCommand("remove_todo", { id }, (current) =>
        current.filter((todo) => todo.id !== id),
      ),
    [runCommand],
  );

  const updateTodoText = useCallback(
    (id: string, text: string) =>
      runCommand("update_todo_text", { id, text }, (current) =>
        current.map((todo) => (todo.id === id ? { ...todo, text } : todo)),
      ),
    [runCommand],
  );

  const toggleTodo = useCallback(
    (id: string) =>
      runCommand("toggle_todo", { id }, (current) => {
        const target = current.find((todo) => todo.id === id);
        if (!target) return current;
        const completed = !target.completed;
        const elapsedMs = target.timerStartedAt
          ? target.elapsedMs + Date.now() - target.timerStartedAt
          : target.elapsedMs;
        const next = {
          ...target,
          completed,
          elapsedMs,
          timerStartedAt: null,
        };
        const rest = current.filter((todo) => todo.id !== id);
        return completed ? [...rest, next] : [next, ...rest];
      }),
    [runCommand],
  );

  const startTimer = useCallback(
    (id: string) =>
      runCommand("start_timer", { id }, (current) => {
        const startedAt = Date.now();
        return current.map((todo) => {
          const elapsedMs = todo.timerStartedAt
            ? todo.elapsedMs + startedAt - todo.timerStartedAt
            : todo.elapsedMs;
          return {
            ...todo,
            elapsedMs,
            timerStartedAt:
              todo.id === id && !todo.completed ? startedAt : null,
          };
        });
      }),
    [runCommand],
  );

  const pauseTimer = useCallback(
    (id: string) =>
      runCommand("pause_timer", { id }, (current) =>
        current.map((todo) =>
          todo.id === id && todo.timerStartedAt
            ? {
                ...todo,
                elapsedMs: todo.elapsedMs + Date.now() - todo.timerStartedAt,
                timerStartedAt: null,
              }
            : todo,
        ),
      ),
    [runCommand],
  );

  const reorderTodos = useCallback(
    (activeId: string, overId: string) =>
      runCommand("reorder_todos", { activeId, overId }, (current) => {
        const from = current.findIndex((todo) => todo.id === activeId);
        const to = current.findIndex((todo) => todo.id === overId);
        if (from < 0 || to < 0) return current;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      }),
    [runCommand],
  );

  const setTodoColor = useCallback(
    (id: string, color: TodoColor) =>
      runCommand("set_todo_color", { id, color }, (current) =>
        current.map((todo) => (todo.id === id ? { ...todo, color } : todo)),
      ),
    [runCommand],
  );

  const pinTodoTop = useCallback(
    (id: string) =>
      runCommand("pin_todo_top", { id }, (current) => {
        const target = current.find((todo) => todo.id === id);
        return target
          ? [target, ...current.filter((todo) => todo.id !== id)]
          : current;
      }),
    [runCommand],
  );

  const liveTodos = useMemo(
    () =>
      todos.map((todo) => ({
        ...todo,
        liveMs: todo.timerStartedAt
          ? todo.elapsedMs + now - todo.timerStartedAt
          : todo.elapsedMs,
      })),
    [now, todos],
  );

  return {
    todos: liveTodos,
    totalMs: liveTodos.reduce((sum, todo) => sum + todo.liveMs, 0),
    activeTimerId:
      todos.find((todo) => todo.timerStartedAt !== null)?.id ?? null,
    addTodo,
    removeTodo,
    updateTodoText,
    toggleTodo,
    startTimer,
    pauseTimer,
    reorderTodos,
    setTodoColor,
    pinTodoTop,
  };
}
