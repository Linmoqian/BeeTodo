import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { StoredTodo } from "../types";

export function useTodos() {
  const [todos, setTodos] = useState<StoredTodo[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    invoke<StoredTodo[]>("list_todos")
      .then((nextTodos) => {
        if (mounted) {
          setTodos(nextTodos);
        }
      })
      .catch((error) => {
        console.error("Failed to load todos", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const addTodo = useCallback(async (text: string) => {
    const nextTodos = await invoke<StoredTodo[]>("add_todo", { text });
    setTodos(nextTodos);
  }, []);

  const removeTodo = useCallback(async (id: string) => {
    const nextTodos = await invoke<StoredTodo[]>("remove_todo", { id });
    setTodos(nextTodos);
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    const nextTodos = await invoke<StoredTodo[]>("toggle_todo", { id });
    setTodos(nextTodos);
  }, []);

  const startTimer = useCallback(async (id: string) => {
    const nextTodos = await invoke<StoredTodo[]>("start_timer", { id });
    setTodos(nextTodos);
  }, []);

  const pauseTimer = useCallback(async (id: string) => {
    const nextTodos = await invoke<StoredTodo[]>("pause_timer", { id });
    setTodos(nextTodos);
  }, []);

  const reorderTodos = useCallback(async (activeId: string, overId: string) => {
    const nextTodos = await invoke<StoredTodo[]>("reorder_todos", {
      activeId,
      overId,
    });
    setTodos(nextTodos);
  }, []);

  const todosWithLiveTime = todos.map((t) => {
    const liveMs = t.timerStartedAt
      ? t.elapsedMs + (now - t.timerStartedAt)
      : t.elapsedMs;
    return { ...t, liveMs };
  });

  const totalMs = todosWithLiveTime.reduce((sum, t) => sum + t.liveMs, 0);

  const activeTimerId =
    todos.find((todo) => todo.timerStartedAt !== null)?.id ?? null;

  return {
    todos: todosWithLiveTime,
    totalMs,
    activeTimerId,
    addTodo,
    removeTodo,
    toggleTodo,
    startTimer,
    pauseTimer,
    reorderTodos,
  };
}
