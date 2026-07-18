import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Maximize2, Pause, TimerReset } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  DEFAULT_SETTINGS,
  getAppSettings,
  getRuntimeTodos,
  isTauriRuntime,
  pauseRuntimeTimer,
  type AppSettings,
} from "../lib/platform";
import type { StoredTodo } from "../types";
import { exitFocusMode, restoreMainWindow } from "../lib/focusWindow";

function formatFocusTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function FocusWindow() {
  const [todos, setTodos] = useState<StoredTodo[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const [nextTodos, nextSettings] = await Promise.all([
        getRuntimeTodos(),
        getAppSettings(),
      ]);
      if (!mounted) return;
      setTodos(nextTodos);
      setSettings(nextSettings);
      setNow(Date.now());
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 500);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void (async () => {
      const stopListening = await getCurrentWebviewWindow().onCloseRequested(() => {
        void restoreMainWindow();
      });
      if (disposed) stopListening();
      else unlisten = stopListening;
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const activeTodo = useMemo(
    () => todos.find((todo) => todo.timerStartedAt !== null) ?? null,
    [todos],
  );
  const liveMs = activeTodo?.timerStartedAt
    ? activeTodo.elapsedMs + now - activeTodo.timerStartedAt
    : activeTodo?.elapsedMs ?? 0;

  return (
    <motion.main
      className="focus-window"
      style={{
        background: `color-mix(in srgb, var(--surface-solid) ${settings.compactOpacity}%, transparent)`,
      }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      data-tauri-drag-region
    >
      <div className="focus-window-icon">
        <TimerReset size={17} />
      </div>
      <div className="focus-window-copy">
        <span>{activeTodo?.text ?? "尚未开始专注"}</span>
        <strong>{formatFocusTime(liveMs)}</strong>
      </div>
      <div className="focus-window-actions">
        <button type="button" aria-label="退出专注模式" onClick={() => void exitFocusMode()}>
          <Maximize2 size={15} />
        </button>
        <button
          type="button"
          aria-label="暂停当前专注"
          disabled={!activeTodo}
          onClick={() => activeTodo && void pauseRuntimeTimer(activeTodo.id)}
        >
          <Pause size={15} fill="currentColor" />
        </button>
      </div>
    </motion.main>
  );
}
