import { getAllWebviewWindows, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "./platform";

const FOCUS_WINDOW_LABEL = "focus";

export async function openFocusWindow() {
  if (!isTauriRuntime()) return;
  const existing = (await getAllWebviewWindows()).find(
    (window) => window.label === FOCUS_WINDOW_LABEL,
  );
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const focusWindow = new WebviewWindow(FOCUS_WINDOW_LABEL, {
    url: "index.html#/focus",
    title: "专注磁贴",
    width: 380,
    height: 116,
    decorations: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    shadow: false,
    center: true,
  });

  focusWindow.once("tauri://error", (event) => {
    console.error("Failed to create focus window", event.payload);
  });
}
