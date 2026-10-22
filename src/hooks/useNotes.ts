import { useCallback, useEffect, useState } from "react";
import {
  createLocalNote,
  LEGACY_NOTES_KEY,
  NOTE_STORAGE_PREFIX,
  NOTES_CHANGED_EVENT,
  readLocalNotes,
  removeLocalNote,
  updateLocalNote,
} from "../lib/notesStore";
import type { StudyNote } from "../types";

const EMPTY_NOTE_CONTENT = "# 新的学习笔记\n\n从一个概念、一段摘录或一道问题开始。";

function createNoteDraft(): StudyNote {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "未命名笔记",
    content: EMPTY_NOTE_CONTENT,
    category: "学习",
    createdAt: now,
    updatedAt: now,
  };
}

export function useNotes() {
  const [notes, setNotes] = useState<StudyNote[]>(() => readLocalNotes());

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === LEGACY_NOTES_KEY ||
        event.key.startsWith(NOTE_STORAGE_PREFIX)
      ) {
        setNotes(readLocalNotes());
      }
    };
    const syncLocal = () => setNotes(readLocalNotes());
    window.addEventListener(NOTES_CHANGED_EVENT, syncLocal);
    const syncTimer = window.setInterval(() => {
      const storedNotes = readLocalNotes();
      setNotes((current) =>
        JSON.stringify(current) === JSON.stringify(storedNotes) ? current : storedNotes,
      );
    }, 800);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(NOTES_CHANGED_EVENT, syncLocal);
      window.clearInterval(syncTimer);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const addNote = useCallback(() => {
    const note = createNoteDraft();
    setNotes(createLocalNote(note));
    return note.id;
  }, []);

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<StudyNote, "title" | "content" | "category">>) => {
      setNotes(updateLocalNote(id, patch));
    },
    [],
  );

  const removeNote = useCallback((id: string) => {
    setNotes(removeLocalNote(id));
  }, []);

  const importNote = useCallback((title: string, content: string) => {
    const now = Date.now();
    const note: StudyNote = {
      id: crypto.randomUUID(),
      title: title.trim() || "导入的笔记",
      content,
      category: "导入",
      createdAt: now,
      updatedAt: now,
    };
    setNotes(createLocalNote(note));
    return note.id;
  }, []);

  return { notes, addNote, updateNote, removeNote, importNote };
}
