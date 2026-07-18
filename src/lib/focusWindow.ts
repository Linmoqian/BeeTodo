import { getAllWebviewWindows, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "./platform";

const FOCUS_WINDOW_LABEL = "focus";

function loadWebRoute(route: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.hash = route;
  window.location.replace(url);
  window.location.reload();
}

async function getWindow(label: string) {
  return (await getAllWebviewWindows()).find((window) => window.label === label);
}

async function hideMainWindow() {
  const mainWindow = await getWindow("main");
  await mainWindow?.hide();
}

export async function restoreMainWindow() {
  if (!isTauriRuntime()) return;
  const mainWindow = await getWindow("main");
  if (!mainWindow) return;
  await mainWindow.unminimize();
  await mainWindow.show();
  await mainWindow.setFocus();
}

export async function exitFocusMode() {
  if (!isTauriRuntime()) {
    loadWebRoute("/");
    return;
  }

  await restoreMainWindow();
  await (await getWindow(FOCUS_WINDOW_LABEL))?.close();
}

export async function openFocusWindow() {
  if (!isTauriRuntime()) {
    loadWebRoute("/focus");
    return;
  }
  const existing = await getWindow(FOCUS_WINDOW_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    await hideMainWindow();
    return;
  }

  const focusWindow = new WebviewWindow(FOCUS_WINDOW_LABEL, {
    url: "index.html#/focus",
    title: "专注磁贴",
    width: 380,
    height: 126,
    decorations: false,
    devtools: false,
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
  focusWindow.once("tauri://created", () => {
    void hideMainWindow();
  });
}
