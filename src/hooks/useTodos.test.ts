import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useTodos } from "./useTodos";
import type { StoredTodo } from "../types";

const STORAGE_KEY = "beetodo-todos";
const FOCUS_STORAGE_KEY = "beetodo-focus-sessions";

function storedTodo(id: string, text: string, completed: boolean): StoredTodo {
  return {
    id,
    text,
    completed,
    createdAt: 1,
    elapsedMs: 0,
    timerStartedAt: null,
    color: "default",
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe("useTodos.clearCompleted", () => {
  it("removes completed todos from localStorage", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([storedTodo("done", "已完成", true), storedTodo("pending", "未完成", false)]),
    );
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.clearCompleted();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredTodo[];
    expect(stored.map((todo) => todo.id)).toEqual(["pending"]);
  });

  it("keeps pending todos when no completed todos exist", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([storedTodo("pending", "未完成", false)]));
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.clearCompleted();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredTodo[];
    expect(stored.map((todo) => todo.id)).toEqual(["pending"]);
  });
});

describe("useTodos focus sessions", () => {
  afterEach(() => vi.useRealTimers());

  it("settles a running timer once when paused", async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 7, 29, 10).getTime();
    vi.setSystemTime(now);
    const running = {
      ...storedTodo("running", "专注中", false),
      timerStartedAt: now - 120_000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([running]));
    const { result } = renderHook(() => useTodos());

    await act(async () => result.current.pauseTimer("running"));
    await act(async () => result.current.pauseTimer("running"));

    expect(result.current.focusSessions).toEqual([{ startedAt: now - 120_000, endedAt: now }]);
    expect(JSON.parse(localStorage.getItem(FOCUS_STORAGE_KEY) ?? "[]")).toEqual(
      result.current.focusSessions,
    );
  });

  it("settles the previous timer when switching tasks", async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 7, 29, 10).getTime();
    vi.setSystemTime(now);
    const running = {
      ...storedTodo("running", "当前任务", false),
      timerStartedAt: now - 60_000,
    };
    const next = storedTodo("next", "下一个任务", false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([running, next]));
    const { result } = renderHook(() => useTodos());

    await act(async () => result.current.startTimer("next"));

    expect(result.current.focusSessions).toEqual([{ startedAt: now - 60_000, endedAt: now }]);
    expect(result.current.activeTimerId).toBe("next");
  });

  it("settles a running timer when its task is completed", async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 7, 29, 10).getTime();
    vi.setSystemTime(now);
    const running = {
      ...storedTodo("running", "完成任务", false),
      timerStartedAt: now - 90_000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([running]));
    const { result } = renderHook(() => useTodos());

    await act(async () => result.current.toggleTodo("running"));

    expect(result.current.focusSessions).toEqual([{ startedAt: now - 90_000, endedAt: now }]);
    expect(result.current.todos[0].completed).toBe(true);
  });

  it("settles a running timer before deleting its task", async () => {
    vi.useFakeTimers();
    const now = new Date(2026, 7, 29, 10).getTime();
    vi.setSystemTime(now);
    const running = {
      ...storedTodo("running", "删除任务", false),
      timerStartedAt: now - 30_000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([running]));
    const { result } = renderHook(() => useTodos());

    await act(async () => result.current.removeTodo("running"));

    expect(result.current.focusSessions).toEqual([{ startedAt: now - 30_000, endedAt: now }]);
    expect(result.current.todos).toEqual([]);
  });
});
