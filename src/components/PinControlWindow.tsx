import { Pin } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export function PinControlWindow() {
  return (
    <main className="pin-control-window">
      <button
        className="pin-control-button"
        type="button"
        aria-label="恢复窗口交互"
        title="双击恢复窗口交互"
        onDoubleClick={() =>
          void invoke("set_click_through", { enabled: false }).catch((error) => {
            console.error("恢复窗口交互失败", error);
          })
        }
      >
        <Pin size={17} />
      </button>
    </main>
  );
}
