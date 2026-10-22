import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
    if (!isTauriRuntime()) return undefined;
    let disposed = false;
    let refreshing = false;
    let refreshAgain = false;
    const subscriptions: (() => void)[] = [];

    const refresh = async (): Promise<void> => {
      if (disposed) return;
      if (refreshing) {
        refreshAgain = true;
        return;
      }
      refreshing = true;
      refreshAgain = false;
      try {
        const [nextTodos, nextFocusSessions] = await Promise.all([
          invoke<StoredTodo[]>("list_todos"),
          getRuntimeFocusSessions(),
        ]);
        // A timer changed during this read. Fetch again rather than applying
        // an outdated running timer or mixing it with newly settled history.
        if (!disposed && !refreshAgain) {
          setTodos(nextTodos);
          setFocusSessions(nextFocusSessions);
          setNow(Date.now());
        }
      } catch (error) {
        console.error("Failed to load todo data", error);
      } finally {
        refreshing = false;
        if (!disposed && refreshAgain) void refresh();
      }
    };

    const register = (subscription: Promise<() => void>) => {
      void subscription
        .then((unlisten) => {
          if (disposed) unlisten();
          else subscriptions.push(unlisten);
        })
        .catch((error) => console.error("Failed to subscribe to timer updates", error));
    };
    register(
      listen("todo-data-changed", () => {
        void refresh();
      }).then((unlisten) => {
        // Cover changes between the initial read and listener registration.
        void refresh();
        return unlisten;
      }),
    );
    register(
      getCurrentWindow().onFocusChanged(({ payload }) => {
        if (payload) void refresh();
      }),
    );
    void refresh();
    return () => {
      disposed = true;
      subscriptions.forEach((unlisten) => unlisten());
    };
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
