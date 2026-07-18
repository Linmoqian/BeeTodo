import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./platform";

function openWebPreview(route: string, name: string, features: string) {
  const url = new URL(window.location.href);
  url.hash = route;
  window.open(url.toString(), name, features);
}

export async function openQuickNoteWindow() {
  if (isTauriRuntime()) {
    await invoke("open_quick_note_window");
    return;
  }
  openWebPreview("#/quick-note", "beetodo-quick-note", "width=380,height=380");
}

export async function toggleNoteTile(noteId: string): Promise<boolean> {
  if (isTauriRuntime()) {
    return invoke<boolean>("toggle_note_tile", { noteId });
  }
  openWebPreview(
    `#/note-tile/${encodeURIComponent(noteId)}`,
    `beetodo-note-tile-${noteId}`,
    "width=340,height=320",
  );
  return true;
}
