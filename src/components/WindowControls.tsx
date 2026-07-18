import { Maximize2, Minus, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "../lib/platform";

export function WindowControls() {
  if (!isTauriRuntime()) return null;

  const appWindow = getCurrentWindow();

  return (
    <div className="window-controls">
      <button
        className="window-control window-close"
        type="button"
        aria-label="关闭窗口"
        title="关闭"
        onClick={() => void appWindow.close()}
      >
        <X size={9} />
      </button>
      <button
        className="window-control window-minimize"
        type="button"
        aria-label="最小化窗口"
        title="最小化"
        onClick={() => void appWindow.minimize()}
      >
        <Minus size={9} />
      </button>
      <button
        className="window-control window-zoom"
        type="button"
        aria-label="缩放窗口"
        title="缩放"
        onClick={() => void appWindow.toggleMaximize()}
      >
        <Maximize2 size={8} />
      </button>
    </div>
  );
}
