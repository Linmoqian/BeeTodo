import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../lib/platform";
import { closePetWindow, openPetWindow } from "../lib/petWindow";

// The main window owns pet visibility, including restoration of saved settings.
export function usePetWindow(enabled: boolean) {
  const pending = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!isTauriRuntime()) return undefined;
    let disposed = false;
    pending.current = pending.current
      .then(async () => {
        if (disposed) return;
        // Complete creation before processing a later disable request.
        await (enabled ? openPetWindow() : closePetWindow());
      })
      .catch((error) => console.error("Failed to synchronize pet window", error));
    return () => {
      disposed = true;
    };
  }, [enabled]);
}
