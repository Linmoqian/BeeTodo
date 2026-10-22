import type { StudyNote } from "../types";

export const LEGACY_NOTES_KEY = "beetodo-study-notes";
export const NOTE_STORAGE_PREFIX = "beetodo-study-note:";
export const NOTES_CHANGED_EVENT = "beetodo-notes-changed";
const EDITABLE_FIELDS = ["title", "content", "category"] as const;
type NotePatch = Partial<Pick<StudyNote, (typeof EDITABLE_FIELDS)[number]>>;

function noteKey(id: string, field: string): string {
  return `${NOTE_STORAGE_PREFIX}${encodeURIComponent(id)}:${field}`;
}

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isNote(value: unknown): value is StudyNote {
  if (!value || typeof value !== "object") return false;
  const note = value as StudyNote;
  return (
    typeof note.id === "string" &&
    EDITABLE_FIELDS.every((field) => typeof note[field] === "string") &&
    Number.isFinite(note.createdAt) &&
    Number.isFinite(note.updatedAt)
  );
}

export function readLocalNotes(): StudyNote[] {
  // Keep the old array as a read-only baseline. Migrating it by rewriting a
  // shared array would reintroduce the same cross-window read/modify/write race.
  const legacy = readJson(LEGACY_NOTES_KEY);
  const notes = new Map<string, StudyNote>(
    (Array.isArray(legacy) ? legacy.filter(isNote) : []).map((note) => [note.id, note]),
  );
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(NOTE_STORAGE_PREFIX) && key.endsWith(":note")) {
      const note = readJson(key);
      if (isNote(note)) notes.set(note.id, note);
    }
  }

  return [...notes.values()]
    .flatMap((stored) => {
      if (localStorage.getItem(noteKey(stored.id, "deleted")) !== null) return [];
      const note = { ...stored };
      EDITABLE_FIELDS.forEach((field) => {
        const value = readJson(noteKey(note.id, field)) as {
          value?: unknown;
          updatedAt?: unknown;
        } | null;
        if (
          value &&
          typeof value.value === "string" &&
          typeof value.updatedAt === "number" &&
          Number.isFinite(value.updatedAt)
        ) {
          note[field] = value.value;
          note.updatedAt = Math.max(note.updatedAt, value.updatedAt);
        }
      });
      return [note];
    })
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id));
}

function notifyChange(): StudyNote[] {
  window.dispatchEvent(new Event(NOTES_CHANGED_EVENT));
  return readLocalNotes();
}

export function createLocalNote(note: StudyNote): StudyNote[] {
  localStorage.setItem(noteKey(note.id, "note"), JSON.stringify(note));
  return notifyChange();
}

export function updateLocalNote(id: string, patch: NotePatch): StudyNote[] {
  // Independent keys make edits to different notes/fields commute, even when
  // separate webviews write before receiving each other's storage events.
  const updatedAt = Date.now();
  EDITABLE_FIELDS.forEach((field) => {
    if (typeof patch[field] === "string") {
      localStorage.setItem(noteKey(id, field), JSON.stringify({ value: patch[field], updatedAt }));
    }
  });
  return notifyChange();
}

export function removeLocalNote(id: string): StudyNote[] {
  // A stale editor may still write fields after deletion. The tombstone keeps
  // those writes from resurrecting the note.
  localStorage.setItem(noteKey(id, "deleted"), "true");
  return notifyChange();
}
