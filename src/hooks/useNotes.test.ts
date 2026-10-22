import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useNotes } from "./useNotes";
import {
  LEGACY_NOTES_KEY,
  readLocalNotes,
  removeLocalNote,
  updateLocalNote,
} from "../lib/notesStore";
import type { StudyNote } from "../types";

const original: StudyNote = {
  id: "original",
  title: "Original",
  content: "Keep me",
  category: "Study",
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LEGACY_NOTES_KEY, JSON.stringify([original]));
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

function staleWindows() {
  // Different webviews receive storage notifications asynchronously. Suppress
  // same-document notifications to exercise writes before synchronization.
  vi.spyOn(window, "dispatchEvent").mockReturnValue(true);
  return [renderHook(() => useNotes()), renderHook(() => useNotes())];
}

describe("notes across windows", () => {
  it("preserves notes imported before either window has synchronized", () => {
    const [first, second] = staleWindows();
    act(() => {
      first.result.current.importNote("A", "First window");
    });
    act(() => {
      second.result.current.importNote("B", "Second window");
    });
    expect(
      readLocalNotes()
        .map((note) => note.title)
        .sort(),
    ).toEqual(["A", "B", "Original"]);
  });

  it("preserves an external addition when a stale editor saves", () => {
    const [first, second] = staleWindows();
    act(() => {
      first.result.current.addNote();
    });
    act(() => {
      second.result.current.updateNote(original.id, { content: "Edited" });
    });
    expect(readLocalNotes()).toHaveLength(2);
    expect(readLocalNotes().find((note) => note.id === original.id)?.content).toBe("Edited");
  });

  it("preserves an external addition when a stale window removes another note", () => {
    const [first, second] = staleWindows();
    let addedId = "";
    act(() => {
      addedId = first.result.current.importNote("Keep", "New");
    });
    act(() => {
      second.result.current.removeNote(original.id);
    });
    expect(readLocalNotes().map((note) => note.id)).toEqual([addedId]);
  });

  it("does not resurrect a deleted note when its stale editor saves", () => {
    const [first, second] = staleWindows();
    act(() => {
      first.result.current.removeNote(original.id);
    });
    act(() => {
      second.result.current.updateNote(original.id, { title: "Stale edit" });
    });
    expect(readLocalNotes()).toEqual([]);
  });

  it("keeps different-field edits interleaved at the storage write boundary", () => {
    const { setItem } = Storage.prototype;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function write(
      this: Storage,
      key,
      value,
    ) {
      if (key.endsWith(":title")) updateLocalNote(original.id, { content: "Other window" });
      setItem.call(this, key, value);
    });
    updateLocalNote(original.id, { title: "New title" });
    expect(readLocalNotes()[0]).toMatchObject({ title: "New title", content: "Other window" });
  });

  it("loads legacy notes and retains changes on remount", () => {
    const first = renderHook(() => useNotes());
    expect(first.result.current.notes).toEqual([original]);
    act(() => {
      first.result.current.updateNote(original.id, { title: "Persisted" });
    });
    first.unmount();
    const reopened = renderHook(() => useNotes());
    expect(reopened.result.current.notes[0].title).toBe("Persisted");
    expect(JSON.parse(localStorage.getItem(LEGACY_NOTES_KEY)!)).toEqual([original]);
  });

  it("synchronizes local consumers without waiting for polling", () => {
    const first = renderHook(() => useNotes());
    const second = renderHook(() => useNotes());
    act(() => {
      first.result.current.importNote("Shared", "New");
    });
    expect(second.result.current.notes).toHaveLength(2);
  });

  it("refreshes on per-note storage events and retains deletions on remount", () => {
    const dispatch = window.dispatchEvent.bind(window);
    vi.spyOn(window, "dispatchEvent").mockImplementation((event) =>
      event.type === "storage" ? dispatch(event) : true,
    );
    const view = renderHook(() => useNotes());
    act(() => {
      removeLocalNote(original.id);
    });
    expect(view.result.current.notes).toEqual([original]);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "beetodo-study-note:original:deleted" }),
      );
    });
    expect(view.result.current.notes).toEqual([]);
    view.unmount();
    expect(renderHook(() => useNotes()).result.current.notes).toEqual([]);
  });
});
