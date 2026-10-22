import { LogicalPosition } from "@tauri-apps/api/dpi";
import { primaryMonitor } from "@tauri-apps/api/window";
import { getAllWebviewWindows, WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "./platform";

const PET_WINDOW_LABEL = "pet";
const PET_WINDOW_WIDTH = 180;
const PET_WINDOW_HEIGHT = 170;
const PET_WINDOW_MARGIN = 24;

async function findPetWindow() {
  const windows = await getAllWebviewWindows();
  return windows.find((window) => window.label === PET_WINDOW_LABEL) ?? null;
}

async function positionPetWindow(window: WebviewWindow) {
  const monitor = await primaryMonitor();

  if (!monitor) {
    await window.center();
    return;
  }

  const scaleFactor = monitor.scaleFactor || 1;
  const workAreaX = monitor.workArea.position.x / scaleFactor;
  const workAreaY = monitor.workArea.position.y / scaleFactor;
  const workAreaWidth = monitor.workArea.size.width / scaleFactor;
  const workAreaHeight = monitor.workArea.size.height / scaleFactor;
  const x = workAreaX + workAreaWidth - PET_WINDOW_WIDTH - PET_WINDOW_MARGIN;
  const y = workAreaY + workAreaHeight - PET_WINDOW_HEIGHT - PET_WINDOW_MARGIN;

  await window.setPosition(new LogicalPosition(x, y));
}

export async function openPetWindow() {
  if (!isTauriRuntime()) return;
  const existingWindow = await findPetWindow();
  if (existingWindow) {
    await existingWindow.show();
    return;
  }

  const petWindow = new WebviewWindow(PET_WINDOW_LABEL, {
    url: "index.html#/pet",
    title: "蜜蜂桌宠",
    width: PET_WINDOW_WIDTH,
    height: PET_WINDOW_HEIGHT,
    decorations: false,
    devtools: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    shadow: false,
    visible: true,
    focus: false,
  });

  let settled = false;
  const subscriptions: (() => void)[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const register = (subscription: Promise<() => void>) => {
        void subscription
          .then((unlisten) => {
            if (settled) unlisten();
            else subscriptions.push(unlisten);
          })
          .catch(reject);
      };
      register(petWindow.once("tauri://created", () => resolve()));
      register(
        petWindow.once("tauri://error", (event) => {
          reject(new Error(`Failed to create pet window: ${String(event.payload)}`));
        }),
      );
    });
  } finally {
    settled = true;
    subscriptions.forEach((unlisten) => unlisten());
  }
  await positionPetWindow(petWindow).catch(() => petWindow.center());
}

export async function closePetWindow() {
  if (!isTauriRuntime()) return;
  const petWindow = await findPetWindow();
  if (petWindow) {
    await petWindow.close();
  }
}
