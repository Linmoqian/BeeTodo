import { useCallback, useEffect, useState } from "react";
import { Pin } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "../lib/platform";

export function MobilePin() {
  const [clickThrough, setClickThrough] = useState(false);

  const updateClickThrough = useCallback(async (enabled: boolean) => {
    try {
      await invoke("set_click_through", { enabled });
      document.documentElement.classList.toggle("is-click-through", enabled);
      setClickThrough(enabled);
    } catch (error) {
      console.error("切换窗口穿透失败", error);
    }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;

    const restoreOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && clickThrough) {
        void updateClickThrough(false);
      }
    };

    window.addEventListener("keydown", restoreOnEscape);
    return () => window.removeEventListener("keydown", restoreOnEscape);
  }, [clickThrough, updateClickThrough]);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;

    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<boolean>("click-through-changed", (event) => {
      document.documentElement.classList.toggle("is-click-through", event.payload);
      setClickThrough(event.payload);
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
      } else {
        unlisten = cleanup;
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  if (!isTauriRuntime()) return null;

  return (
    <button
      className={clickThrough ? "mobile-pin is-active" : "mobile-pin"}
      type="button"
      aria-label={clickThrough ? "恢复窗口交互" : "固定并穿透窗口"}
      aria-pressed={clickThrough}
      title={clickThrough ? "已固定并穿透，按 Esc 恢复交互" : "双击固定并穿透窗口"}
      onDoubleClick={() => void updateClickThrough(!clickThrough)}
    >
      <Pin size={16} />
      <span className="sr-only">{clickThrough ? "恢复交互" : "固定窗口"}</span>
    </button>
  );
}
