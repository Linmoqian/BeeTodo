import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useTodos } from "./useTodos";
import { pauseRuntimeTimer, startRuntimeTimer } from "../lib/platform";
import type { FocusSession, StoredTodo } from "../types";

const runtime = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  onFocusChanged: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: runtime.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: runtime.listen }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ onFocusChanged: runtime.onFocusChanged }),
}));

let todo: StoredTodo;
let sessions: FocusSession[];
let changed: (() => void) | undefined;
let focused: ((event: { payload: boolean }) => void) | undefined;
const stopChanges = vi.fn();
const stopFocus = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 22, 10));
  Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
  todo = {
    id: "running",
    text: "Focus",
    completed: false,
    createdAt: 1,
    elapsedMs: 0,
    timerStartedAt: Date.now() - 60000,
    color: "default",
  };
  sessions = [];
  changed = undefined;
  focused = undefined;
  runtime.listen.mockImplementation(async (_event: string, handler: () => void) => {
    changed = handler;
    return stopChanges;
  });
  runtime.onFocusChanged.mockImplementation(async (handler: typeof focused) => {
    focused = handler;
    return stopFocus;
  });
  runtime.invoke.mockImplementation(async (command: string) => {
    if (command === "list_focus_sessions") return [...sessions];
    if (command === "pause_timer") {
      const endedAt = Date.now();
      sessions = [{ startedAt: todo.timerStartedAt!, endedAt }];
      todo = { ...todo, elapsedMs: endedAt - todo.timerStartedAt!, timerStartedAt: null };
      changed?.();
    }
    if (command === "start_timer") {
      todo = { ...todo, timerStartedAt: Date.now() };
      changed?.();
    }
    return [{ ...todo }];
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  vi.useRealTimers();
  vi.resetAllMocks();
});

async function mountMainWindow() {
  const hook = renderHook(() => useTodos());
  await act(async () => {});
  return hook;
}

describe("desktop timer synchronization", () => {
  it("stops main-window elapsed time and updates history after a tile pauses", async () => {
    const { result } = await mountMainWindow();
    expect(result.current.activeTimerId).toBe("running");
    await act(async () => {
      await pauseRuntimeTimer("running");
    });
    expect(result.current.activeTimerId).toBeNull();
    expect(result.current.todos[0].liveMs).toBe(60000);
    expect(result.current.focusSessions).toEqual(sessions);
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.todos[0].liveMs).toBe(60000);
    expect(result.current.focusStats.todayMs).toBe(60000);
  });

  it("resumes the main-window clock when the tile continues", async () => {
    const { result } = await mountMainWindow();
    await act(async () => {
      await pauseRuntimeTimer("running");
    });
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await act(async () => {
      await startRuntimeTimer("running");
    });
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.activeTimerId).toBe("running");
    expect(result.current.todos[0].liveMs).toBe(70000);
  });

  it("refreshes on native focus even if the change event was missed", async () => {
    const { result } = await mountMainWindow();
    todo = { ...todo, elapsedMs: 60000, timerStartedAt: null };
    await act(async () => {
      focused?.({ payload: true });
    });
    expect(result.current.activeTimerId).toBeNull();
    expect(result.current.todos[0].liveMs).toBe(60000);
  });

  it("discards an in-flight read and reloads when a change arrives", async () => {
    const { result } = await mountMainWindow();
    let finishRead: ((value: StoredTodo[]) => void) | undefined;
    runtime.invoke.mockImplementationOnce(
      () =>
        new Promise<StoredTodo[]>((resolve) => {
          finishRead = resolve;
        }),
    );
    const stale = { ...todo };
    await act(async () => {
      focused?.({ payload: true });
    });
    todo = { ...todo, elapsedMs: 60000, timerStartedAt: null };
    await act(async () => {
      changed?.();
      finishRead?.([stale]);
    });
    expect(result.current.activeTimerId).toBeNull();
    expect(result.current.todos[0].liveMs).toBe(60000);
  });

  it("releases subscriptions, including registrations completed after unmount", async () => {
    let finishListen: ((stop: () => void) => void) | undefined;
    runtime.listen.mockImplementationOnce(
      () =>
        new Promise<() => void>((resolve) => {
          finishListen = resolve;
        }),
    );
    const { unmount } = await mountMainWindow();
    unmount();
    await act(async () => {
      finishListen?.(stopChanges);
    });
    expect(stopChanges).toHaveBeenCalledOnce();
    expect(stopFocus).toHaveBeenCalledOnce();
  });
});
