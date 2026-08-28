import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  getRuntimeFocusSessions,
  isTauriRuntime,
  readLocalFocusSessions,
  readLocalTodos,
  settleLocalFocusSessions,
  writeLocalTodos,
} from "../lib/platform";
import { emitDebugEvent } from "../lib/debugBus";
import { getDailyFocusStats } from "../lib/focusStats";
import type { FocusSession, StoredTodo, TodoColor } from "../types";

type TodoUpdater = (todos: StoredTodo[]) => StoredTodo[];

export function useTodos() {
  const [todos, setTodos] = useState<StoredTodo[]>(() =>
    isTauriRuntime() ? [] : readLocalTodos(),
  );
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() =>
    isTauriRuntime() ? [] : readLocalFocusSessions(),
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void Promise.all([invoke<StoredTodo[]>("list_todos"), getRuntimeFocusSessions()])
      .then(([nextTodos, nextFocusSessions]) => {
        setTodos(nextTodos);
        setFocusSessions(nextFocusSessions);
      })
      .catch((error) => console.error("Failed to load todo data", error));
  }, []);

  useEffect(() => {
    if (isTauriRuntime()) return;
    const syncTodoData = () => {
      setTodos(readLocalTodos());
      setFocusSessions(readLocalFocusSessions());
    };
    window.addEventListener("storage", syncTodoData);
    return () => window.removeEventListener("storage", syncTodoData);
  }, []);

  const updateLocal = useCallback((updater: TodoUpdater) => {
    const nextTodos = writeLocalTodos(updater(readLocalTodos()));
    setTodos(nextTodos);
    setFocusSessions(readLocalFocusSessions());
  }, []);

  const runCommand = useCallback(
    async (command: string, args: Record<string, unknown>, updater: TodoUpdater) => {
      if (isTauriRuntime()) {
        setTodos(await invoke<StoredTodo[]>(command, args));
        setFocusSessions(await getRuntimeFocusSessions());
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
      runCommand("remove_todo", { id }, (current) => {
        settleLocalFocusSessions(current, Date.now(), id);
        return current.filter((todo) => todo.id !== id);
      }),
    [runCommand],
  );

  const clearCompleted = useCallback(
    () =>
      runCommand("clear_completed", {}, (current) => {
        const endedAt = Date.now();
        current
          .filter((todo) => todo.completed && todo.timerStartedAt !== null)
          .forEach((todo) => settleLocalFocusSessions(current, endedAt, todo.id));
        return current.filter((todo) => !todo.completed);
      }),
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
        const endedAt = Date.now();
        settleLocalFocusSessions(current, endedAt, id);
        const completed = !target.completed;
        const elapsedMs = target.timerStartedAt
          ? target.elapsedMs + endedAt - target.timerStartedAt
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
        settleLocalFocusSessions(current, startedAt);
        return current.map((todo) => {
          const elapsedMs = todo.timerStartedAt
            ? todo.elapsedMs + startedAt - todo.timerStartedAt
            : todo.elapsedMs;
          return {
            ...todo,
            elapsedMs,
            timerStartedAt: todo.id === id && !todo.completed ? startedAt : null,
          };
        });
      }),
    [runCommand],
  );

  const pauseTimer = useCallback(
    (id: string) =>
      runCommand("pause_timer", { id }, (current) => {
        const endedAt = Date.now();
        settleLocalFocusSessions(current, endedAt, id);
        return current.map((todo) =>
          todo.id === id && todo.timerStartedAt
            ? {
                ...todo,
                elapsedMs: todo.elapsedMs + endedAt - todo.timerStartedAt,
                timerStartedAt: null,
              }
            : todo,
        );
      }),
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
        return target ? [target, ...current.filter((todo) => todo.id !== id)] : current;
      }),
    [runCommand],
  );

  const liveTodos = useMemo(
    () =>
      todos.map((todo) => ({
        ...todo,
        liveMs: todo.timerStartedAt ? todo.elapsedMs + now - todo.timerStartedAt : todo.elapsedMs,
      })),
    [now, todos],
  );

  const focusStats = useMemo(
    () => getDailyFocusStats(focusSessions, todos, now),
    [focusSessions, now, todos],
  );
  const todayFocusMinutes = Math.floor(focusStats.todayMs / 60_000);
  const yesterdayFocusMinutes = Math.floor(focusStats.yesterdayMs / 60_000);

  useEffect(() => {
    emitDebugEvent("focus-stats", "今日与昨日专注统计已更新", "debug", {
      todayMinutes: todayFocusMinutes,
      yesterdayMinutes: yesterdayFocusMinutes,
    });
  }, [todayFocusMinutes, yesterdayFocusMinutes]);

  return {
    todos: liveTodos,
    focusSessions,
    focusStats,
    totalMs: liveTodos.reduce((sum, todo) => sum + todo.liveMs, 0),
    activeTimerId: todos.find((todo) => todo.timerStartedAt !== null)?.id ?? null,
    addTodo,
    removeTodo,
    clearCompleted,
    updateTodoText,
    toggleTodo,
    startTimer,
    pauseTimer,
    reorderTodos,
    setTodoColor,
    pinTodoTop,
  };
}
