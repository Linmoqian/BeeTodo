import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { Heart, ListTodo, Power } from "lucide-react";
import {
  getAppSettings,
  getRuntimeTodos,
  isTauriRuntime,
  updateAppSettings,
} from "../lib/platform";
import type { StoredTodo } from "../types";

type PetAction = "idle" | "focus" | "pause" | "celebrate" | "sleep" | "love";

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
    intervalMs: 900,
    loop: true,
  },
  focus: {
    frames: [
      "/pet-actions/focus-01.png",
      "/pet-actions/focus-02.png",
      "/pet-actions/focus-03.png",
      "/pet-actions/focus-04.png",
    ],
    intervalMs: 700,
    loop: true,
  },
  pause: {
    frames: [
      "/pet-actions/pause-01.png",
      "/pet-actions/pause-02.png",
      "/pet-actions/pause-03.png",
      "/pet-actions/pause-04.png",
    ],
    intervalMs: 1200,
    loop: true,
  },
  celebrate: {
    frames: [
      "/pet-actions/celebrate-01.png",
      "/pet-actions/celebrate-02.png",
      "/pet-actions/celebrate-03.png",
      "/pet-actions/celebrate-04.png",
    ],
    intervalMs: 420,
    loop: true,
  },
  sleep: {
    frames: [
      "/pet-actions/sleep-01.png",
      "/pet-actions/sleep-02.png",
      "/pet-actions/sleep-03.png",
      "/pet-actions/sleep-04.png",
    ],
    intervalMs: 900,
    loop: false,
  },
  love: {
    frames: [
      "/pet-actions/love-01.png",
      "/pet-actions/love-02.png",
      "/pet-actions/love-03.png",
      "/pet-actions/love-04.png",
    ],
    intervalMs: 650,
    loop: true,
  },
};

const TEMP_ACTION_DURATION_MS = 12000;
const CLOSE_SLEEP_DURATION_MS = 1800;

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
  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [userName, setUserName] = useState("工程师");
  const [petName, setPetName] = useState("小蜜蜂");
  const completedCountRef = useRef<number | null>(null);
  const overrideTimerRef = useRef<number | null>(null);

  const playTemporary = useCallback(
    (action: PetAction, durationMs = TEMP_ACTION_DURATION_MS) => {
      if (overrideTimerRef.current !== null) {
        window.clearTimeout(overrideTimerRef.current);
      }

      setActionOverride(action);
      setActionFrame(0);
      overrideTimerRef.current = window.setTimeout(() => {
        setActionOverride(null);
        overrideTimerRef.current = null;
      }, durationMs);
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const loadTodos = async () => {
      try {
        const [nextTodos, settings] = await Promise.all([
          getRuntimeTodos(),
          getAppSettings(),
        ]);
        if (!mounted) return;
        setUserName(settings.userName);
        setPetName(settings.petName);

        const completedCount = nextTodos.filter((todo) => todo.completed).length;
        if (
          completedCountRef.current !== null &&
          completedCount > completedCountRef.current
        ) {
          playTemporary("celebrate");
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
  }, [playTemporary]);

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
    : `${userName}好棒！`;

  const closePet = async () => {
    setMenuPosition(null);
    if (overrideTimerRef.current !== null) {
      window.clearTimeout(overrideTimerRef.current);
      overrideTimerRef.current = null;
    }

    setActionOverride("sleep");
    setActionFrame(0);
    await new Promise((resolve) => {
      window.setTimeout(resolve, CLOSE_SLEEP_DURATION_MS);
    });

    if (!isTauriRuntime()) return;
    await updateAppSettings(
      "set_pet_enabled",
      { enabled: false },
      { petEnabled: false },
    );
    await getCurrentWindow().close();
  };

  const openTodoWindow = async () => {
    setMenuPosition(null);
    if (!isTauriRuntime()) {
      window.location.assign(`${window.location.origin}${window.location.pathname}#/`);
      return;
    }
    try {
      const mainWindow = (await getAllWindows()).find(
        (window) => window.label === "main",
      );
      if (!mainWindow) return;
      await mainWindow.show();
      await mainWindow.unminimize();
      await mainWindow.setFocus();
    } catch (error) {
      console.error("Failed to open TODO window", error);
    }
  };

  const petPet = () => {
    setMenuPosition(null);
    playTemporary("love");
  };

  const startPetDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !isTauriRuntime()) return;
    void getCurrentWindow().startDragging();
  };

  const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 116;
    const menuHeight = 112;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setMenuPosition({
      x: Math.max(8, x),
      y: Math.max(8, y),
    });
  };

  useEffect(() => {
    setActionFrame(0);
    const interval = window.setInterval(() => {
      setActionFrame((frame) => frame + 1);
    }, actionConfig.intervalMs);
    return () => window.clearInterval(interval);
  }, [actionConfig.intervalMs, currentAction]);

  useEffect(() => {
    const hideMenu = () => setMenuPosition(null);
    window.addEventListener("blur", hideMenu);
    return () => window.removeEventListener("blur", hideMenu);
  }, []);

  useEffect(() => {
    const preventNativeMenu = (event: globalThis.MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener("contextmenu", preventNativeMenu, true);
    return () => window.removeEventListener("contextmenu", preventNativeMenu, true);
  }, []);

  return (
    <div
      className={`pet-window pet-window-${currentAction}`}
      onClick={() => setMenuPosition(null)}
      onContextMenu={openContextMenu}
    >
      <div
        className="pet-stage"
        aria-live="polite"
        onMouseDown={startPetDrag}
      >
        <img className="pet-bee" src={petImage} alt={petName} />
        <span className="pet-shadow" />
      </div>

      <div className="pet-bubble">
        <span className="pet-status">
          {statusText}
        </span>
      </div>

      {menuPosition && (
        <div
          className="pet-menu"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button type="button" onClick={() => void closePet()}>
            <Power size={13} />
            <span>关闭{petName}</span>
          </button>
          <button type="button" onClick={petPet}>
            <Heart size={13} />
            <span>爱抚{petName}</span>
          </button>
          <button type="button" onClick={() => void openTodoWindow()}>
            <ListTodo size={13} />
            <span>打开TODO</span>
          </button>
        </div>
      )}
    </div>
  );
}
