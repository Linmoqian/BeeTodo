import { useCallback, useEffect, useState } from "react";
import { readLocalNotes, writeLocalNotes } from "../lib/platform";
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
    writeLocalNotes(notes);
  }, [notes]);

  const addNote = useCallback(() => {
    const note = createNoteDraft();
    setNotes((current) => [note, ...current]);
    return note.id;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Pick<StudyNote, "title" | "content" | "category">>) => {
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note,
      ),
    );
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
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
    setNotes((current) => [note, ...current]);
    return note.id;
  }, []);

  return { notes, addNote, updateNote, removeNote, importNote };
}
