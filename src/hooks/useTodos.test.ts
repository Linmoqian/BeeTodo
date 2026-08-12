import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useTodos } from "./useTodos";
import type { StoredTodo } from "../types";

const STORAGE_KEY = "beetodo-todos";

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
      JSON.stringify([
        storedTodo("done", "已完成", true),
        storedTodo("pending", "未完成", false),
      ]),
    );
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.clearCompleted();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredTodo[];
    expect(stored.map((todo) => todo.id)).toEqual(["pending"]);
  });

  it("keeps pending todos when no completed todos exist", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([storedTodo("pending", "未完成", false)]),
    );
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.clearCompleted();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredTodo[];
    expect(stored.map((todo) => todo.id)).toEqual(["pending"]);
  });
});
