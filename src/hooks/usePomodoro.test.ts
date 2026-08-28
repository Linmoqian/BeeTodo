import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POMODORO_DURATION_MS, usePomodoro } from "./usePomodoro";

const STORAGE_KEY = "beetodo-pomodoro";
const NOW = new Date(2026, 7, 29, 10).getTime();

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("usePomodoro", () => {
  it("starts, pauses and resets a 25 minute timer", () => {
    const { result } = renderHook(() => usePomodoro());

    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.remainingMs).toBe(POMODORO_DURATION_MS - 60_000);

    act(() => result.current.pause());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.remainingMs).toBe(POMODORO_DURATION_MS - 60_000);

    act(() => result.current.reset());
    expect(result.current.remainingMs).toBe(POMODORO_DURATION_MS);
  });

  it("finishes at zero", () => {
    const { result } = renderHook(() => usePomodoro());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(POMODORO_DURATION_MS));

    expect(result.current.remainingMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isComplete).toBe(true);
  });

  it("restores a running timer from its persisted deadline", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        remainingMs: POMODORO_DURATION_MS,
        isRunning: true,
        endsAt: NOW + 10 * 60_000,
      }),
    );

    vi.setSystemTime(NOW + 4 * 60_000);
    const { result } = renderHook(() => usePomodoro());

    expect(result.current.isRunning).toBe(true);
    expect(result.current.remainingMs).toBe(6 * 60_000);
  });

  it("restores an elapsed deadline as completed", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        remainingMs: POMODORO_DURATION_MS,
        isRunning: true,
        endsAt: NOW - 1,
      }),
    );

    const { result } = renderHook(() => usePomodoro());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });
});
