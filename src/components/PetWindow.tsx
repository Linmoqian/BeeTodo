import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X } from "lucide-react";
import type { StoredTodo } from "../types";

interface AppSettings {
  alwaysOnTop: boolean;
  compactOpacity: number;
  petEnabled: boolean;
}

type PetAction = "idle" | "focus" | "pause" | "celebrate" | "sleep";

interface PetActionConfig {
  frames: string[];
  intervalMs: number;
  loop: boolean;
}

const PET_ACTIONS: Record<PetAction, PetActionConfig> = {
  idle: {
    frames: [
      "/pet-actions/idle-01.png",
      "/pet-actions/idle-02.png",
      "/pet-actions/idle-03.png",
      "/pet-actions/idle-04.png",
    ],
    intervalMs: 760,
    loop: true,
  },
  focus: {
    frames: [
      "/pet-actions/focus-01.png",
      "/pet-actions/focus-02.png",
      "/pet-actions/focus-03.png",
      "/pet-actions/focus-04.png",
    ],
    intervalMs: 360,
    loop: true,
  },
  pause: {
    frames: [
      "/pet-actions/pause-01.png",
      "/pet-actions/pause-02.png",
      "/pet-actions/pause-03.png",
      "/pet-actions/pause-04.png",
    ],
    intervalMs: 900,
    loop: true,
  },
  celebrate: {
    frames: [
      "/pet-actions/celebrate-01.png",
      "/pet-actions/celebrate-02.png",
      "/pet-actions/celebrate-03.png",
      "/pet-actions/celebrate-04.png",
    ],
    intervalMs: 320,
    loop: false,
  },
  sleep: {
    frames: [
      "/pet-actions/sleep-01.png",
      "/pet-actions/sleep-02.png",
      "/pet-actions/sleep-03.png",
      "/pet-actions/sleep-04.png",
    ],
    intervalMs: 420,
    loop: false,
  },
};

function getLiveMs(todo: StoredTodo, now: number) {
  return todo.timerStartedAt
    ? todo.elapsedMs + (now - todo.timerStartedAt)
    : todo.elapsedMs;
}

function formatPetTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PetWindow() {
  const [todos, setTodos] = useState<StoredTodo[]>([]);
  const [now, setNow] = useState(Date.now());
  const [actionOverride, setActionOverride] = useState<PetAction | null>(null);
  const [actionFrame, setActionFrame] = useState(0);
  const completedCountRef = useRef<number | null>(null);
  const overrideTimerRef = useRef<number | null>(null);

  const playOnce = (action: PetAction) => {
    const config = PET_ACTIONS[action];
    if (overrideTimerRef.current !== null) {
      window.clearTimeout(overrideTimerRef.current);
    }

    setActionOverride(action);
    overrideTimerRef.current = window.setTimeout(() => {
      setActionOverride(null);
      overrideTimerRef.current = null;
    }, config.frames.length * config.intervalMs);
  };

  useEffect(() => {
    let mounted = true;

    const loadTodos = async () => {
      try {
        const nextTodos = await invoke<StoredTodo[]>("list_todos");
        if (!mounted) return;

        const completedCount = nextTodos.filter((todo) => todo.completed).length;
        if (
          completedCountRef.current !== null &&
          completedCount > completedCountRef.current
        ) {
          playOnce("celebrate");
        }
        completedCountRef.current = completedCount;
        setTodos(nextTodos);
        setNow(Date.now());
      } catch (error) {
        console.error("Failed to load pet todos", error);
      }
    };

    void loadTodos();
    const interval = window.setInterval(loadTodos, 1000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      if (overrideTimerRef.current !== null) {
        window.clearTimeout(overrideTimerRef.current);
      }
    };
  }, []);

  const activeTodo = useMemo(
    () => todos.find((todo) => todo.timerStartedAt !== null) ?? null,
    [todos],
  );
  const incompleteCount = todos.filter((todo) => !todo.completed).length;
  const baseAction: PetAction = activeTodo
    ? "focus"
    : incompleteCount > 0
      ? "idle"
      : "pause";
  const currentAction = actionOverride ?? baseAction;
  const actionConfig = PET_ACTIONS[currentAction];
  const frameIndex = actionConfig.loop
    ? actionFrame % actionConfig.frames.length
    : Math.min(actionFrame, actionConfig.frames.length - 1);
  const petImage = actionConfig.frames[frameIndex];
  const statusText = activeTodo
    ? formatPetTime(getLiveMs(activeTodo, now))
    : incompleteCount > 0
      ? `${incompleteCount} 项待办`
      : "休息中";

  const closePet = async () => {
    playOnce("sleep");
    await new Promise((resolve) => {
      window.setTimeout(resolve, PET_ACTIONS.sleep.frames.length * PET_ACTIONS.sleep.intervalMs);
    });

    try {
      await invoke<AppSettings>("set_pet_enabled", { enabled: false });
    } catch (error) {
      console.error("Failed to persist pet window state", error);
    } finally {
      await getCurrentWindow().close();
    }
  };

  useEffect(() => {
    setActionFrame(0);
    const interval = window.setInterval(() => {
      setActionFrame((frame) => frame + 1);
    }, actionConfig.intervalMs);
    return () => window.clearInterval(interval);
  }, [actionConfig.intervalMs, currentAction]);

  return (
    <div className={`pet-window pet-window-${currentAction}`} data-tauri-drag-region>
      <button
        type="button"
        className="pet-close"
        aria-label="关闭蜜蜂桌宠"
        title="关闭"
        onClick={() => void closePet()}
      >
        <X size={13} />
      </button>

      <div
        className="pet-stage"
        aria-live="polite"
      >
        <img className="pet-bee" src={petImage} alt="蜜蜂桌宠" />
        <span className="pet-shadow" />
      </div>

      <div className="pet-bubble">
        <span className="pet-status">
          {currentAction === "celebrate"
            ? "完成啦"
            : currentAction === "sleep"
              ? "晚安"
              : statusText}
        </span>
      </div>
    </div>
  );
}
