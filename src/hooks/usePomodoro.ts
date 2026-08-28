import { useCallback, useEffect, useState } from "react";
import { emitDebugEvent } from "../lib/debugBus";

export const POMODORO_DURATION_MS = 25 * 60 * 1000;
const POMODORO_STORAGE_KEY = "beetodo-pomodoro";

interface PomodoroState {
  remainingMs: number;
  isRunning: boolean;
  endsAt: number | null;
}

function initialPomodoroState(now: number): PomodoroState {
  try {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) {
      return {
        remainingMs: POMODORO_DURATION_MS,
        isRunning: false,
        endsAt: null,
      };
    }
    const stored = JSON.parse(raw) as Partial<PomodoroState>;
    if (stored.isRunning && typeof stored.endsAt === "number") {
      const remainingMs = Math.max(0, stored.endsAt - now);
      return {
        remainingMs,
        isRunning: remainingMs > 0,
        endsAt: remainingMs > 0 ? stored.endsAt : null,
      };
    }
    const remainingMs =
      typeof stored.remainingMs === "number"
        ? Math.min(POMODORO_DURATION_MS, Math.max(0, stored.remainingMs))
        : POMODORO_DURATION_MS;
    return { remainingMs, isRunning: false, endsAt: null };
  } catch {
    return {
      remainingMs: POMODORO_DURATION_MS,
      isRunning: false,
      endsAt: null,
    };
  }
}

function persistPomodoroState(state: PomodoroState) {
  localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state));
}

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>(() => initialPomodoroState(Date.now()));

  useEffect(() => {
    persistPomodoroState(state);
  }, [state]);

  useEffect(() => {
    if (!state.isRunning || state.endsAt === null) return undefined;

    const updateRemaining = () => {
      const remainingMs = Math.max(0, state.endsAt! - Date.now());
      if (remainingMs === 0) {
        setState({ remainingMs: 0, isRunning: false, endsAt: null });
        emitDebugEvent("pomodoro", "番茄钟已完成");
        return;
      }
      setState((current) => ({ ...current, remainingMs }));
    };
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [state.endsAt, state.isRunning]);

  const start = useCallback(() => {
    setState((current) => {
      if (current.isRunning || current.remainingMs === 0) return current;
      const next = {
        ...current,
        isRunning: true,
        endsAt: Date.now() + current.remainingMs,
      };
      emitDebugEvent("pomodoro", "番茄钟已开始", "info", {
        remainingMs: current.remainingMs,
      });
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    setState((current) => {
      if (!current.isRunning || current.endsAt === null) return current;
      const next = {
        remainingMs: Math.max(0, current.endsAt - Date.now()),
        isRunning: false,
        endsAt: null,
      };
      emitDebugEvent("pomodoro", "番茄钟已暂停", "info", {
        remainingMs: next.remainingMs,
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      remainingMs: POMODORO_DURATION_MS,
      isRunning: false,
      endsAt: null,
    });
    emitDebugEvent("pomodoro", "番茄钟已重置");
  }, []);

  return {
    remainingMs: state.remainingMs,
    isRunning: state.isRunning,
    isComplete: state.remainingMs === 0,
    progress: state.remainingMs / POMODORO_DURATION_MS,
    start,
    pause,
    reset,
  };
}
