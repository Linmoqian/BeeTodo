import { useState, useCallback, useEffect, useRef } from "react";
import type { Todo } from "../types";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimerIdRef = useRef<string | null>(null);

  // Tick every second to update active timer display
  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const addTodo = useCallback((text: string) => {
    setTodos((prev) => [
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
        createdAt: Date.now(),
        elapsedMs: 0,
        timerStartedAt: null,
        liveMs: 0,
      },
      ...prev,
    ]);
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => {
      const todo = prev.find((t) => t.id === id);
      if (todo?.timerStartedAt) activeTimerIdRef.current = null;
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const completing = !t.completed;
        // Stop timer when completing a task
        if (completing && t.timerStartedAt) {
          activeTimerIdRef.current = null;
          return {
            ...t,
            completed: true,
            elapsedMs: t.elapsedMs + (Date.now() - t.timerStartedAt),
            timerStartedAt: null,
          };
        }
        return { ...t, completed: completing };
      })
    );
  }, []);

  const startTimer = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        // Pause any currently running timer
        if (t.timerStartedAt) {
          activeTimerIdRef.current = null;
          return {
            ...t,
            elapsedMs: t.elapsedMs + (Date.now() - t.timerStartedAt),
            timerStartedAt: null,
          };
        }
        // Start the target timer
        if (t.id === id) {
          activeTimerIdRef.current = id;
          return { ...t, timerStartedAt: Date.now() };
        }
        return t;
      })
    );
  }, []);

  const pauseTimer = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id || !t.timerStartedAt) return t;
        activeTimerIdRef.current = null;
        return {
          ...t,
          elapsedMs: t.elapsedMs + (Date.now() - t.timerStartedAt),
          timerStartedAt: null,
        };
      })
    );
  }, []);

  const reorderTodos = useCallback(
    (activeId: string, overId: string) => {
      setTodos((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === activeId);
        const newIndex = prev.findIndex((t) => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);
        return next;
      });
    },
    []
  );

  // Compute live elapsed time for each todo
  const todosWithLiveTime = todos.map((t) => {
    const liveMs = t.timerStartedAt
      ? t.elapsedMs + (now - t.timerStartedAt)
      : t.elapsedMs;
    return { ...t, liveMs };
  });

  // Total tracked time across all todos
  const totalMs = todosWithLiveTime.reduce((sum, t) => sum + t.liveMs, 0);

  const activeTimerId = activeTimerIdRef.current;

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
