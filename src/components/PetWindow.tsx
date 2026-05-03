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

type PetMood = "idle" | "focus" | "celebrate";

const PET_ACTIONS: Record<PetMood, string[]> = {
  idle: [
    "/pet-actions/idle-heart.png",
    "/pet-actions/idle-smile.png",
    "/pet-actions/idle-heart.png",
    "/pet-actions/idle-wink.png",
  ],
  focus: [
    "/pet-actions/focus-wing-up.png",
    "/pet-actions/focus-wing-down.png",
  ],
  celebrate: [
    "/pet-actions/celebrate-hearts.png",
    "/pet-actions/celebrate-many-hearts.png",
  ],
};

const PET_ACTION_INTERVALS: Record<PetMood, number> = {
  idle: 900,
  focus: 260,
  celebrate: 340,
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
  const [celebrating, setCelebrating] = useState(false);
  const [actionFrame, setActionFrame] = useState(0);
  const completedCountRef = useRef<number | null>(null);

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
          setCelebrating(true);
          window.setTimeout(() => setCelebrating(false), 2400);
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
    };
  }, []);

  const activeTodo = useMemo(
    () => todos.find((todo) => todo.timerStartedAt !== null) ?? null,
    [todos],
  );
  const incompleteCount = todos.filter((todo) => !todo.completed).length;
  const mood: PetMood = celebrating ? "celebrate" : activeTodo ? "focus" : "idle";
  const actionFrames = PET_ACTIONS[mood];
  const petImage = actionFrames[actionFrame % actionFrames.length];
  const statusText = activeTodo
    ? formatPetTime(getLiveMs(activeTodo, now))
    : incompleteCount > 0
      ? `${incompleteCount} 项待办`
      : "休息中";

  const closePet = async () => {
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
    }, PET_ACTION_INTERVALS[mood]);
    return () => window.clearInterval(interval);
  }, [mood]);

  return (
    <div className={`pet-window pet-window-${mood}`} data-tauri-drag-region>
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
          {mood === "celebrate" ? "完成啦" : statusText}
        </span>
      </div>
    </div>
  );
}
