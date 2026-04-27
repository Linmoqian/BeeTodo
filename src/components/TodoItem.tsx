import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { Play, Pause, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Todo } from "../types";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface TodoItemProps {
  todo: Todo;
  isActive: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onStartTimer: (id: string) => void;
  onPauseTimer: (id: string) => void;
}

export function TodoItem({
  todo,
  isActive,
  onToggle,
  onRemove,
  onStartTimer,
  onPauseTimer,
}: TodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTimerClick = () => {
    if (todo.completed) return;
    if (isActive) {
      onPauseTimer(todo.id);
    } else {
      onStartTimer(todo.id);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isActive
          ? "timer-active-glow bg-[oklch(0.16_0.008_75)]"
          : "bg-[oklch(0.14_0.005_270)] hover:bg-[oklch(0.17_0.005_270)]"
      } ${isDragging ? "ring-1 ring-amber/30" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-[oklch(0.35_0.005_270)] transition-colors hover:text-[oklch(0.5_0.005_270)] active:cursor-grabbing"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="2" r="1.5" />
          <circle cx="9" cy="2" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="14" r="1.5" />
          <circle cx="9" cy="14" r="1.5" />
        </svg>
      </button>

      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggle(todo.id)}
        className="border-[oklch(0.35_0.01_270)] data-[state=checked]:bg-amber data-[state=checked]:border-amber"
      />

      <span
        className={`flex-1 text-sm ${
          todo.completed
            ? "text-[oklch(0.4_0.005_270)] line-through"
            : "text-[oklch(0.88_0_0)]"
        }`}
      >
        {todo.text}
      </span>

      {/* Timer display */}
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-xs tabular-nums tracking-wide ${
            isActive
              ? "text-amber"
              : todo.liveMs > 0
                ? "text-[oklch(0.6_0.01_270)]"
                : "text-[oklch(0.35_0.005_270)]"
          }`}
        >
          {formatTime(todo.liveMs)}
        </span>

        {isActive && (
          <span className="timer-active-dot h-1.5 w-1.5 rounded-full bg-amber" />
        )}

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleTimerClick}
          disabled={todo.completed}
          className={`transition-colors ${
            todo.completed
              ? "cursor-not-allowed text-[oklch(0.25_0.005_270)]"
              : isActive
                ? "text-amber hover:text-[oklch(0.85_0.16_75)]"
                : "text-[oklch(0.4_0.005_270)] hover:text-amber"
          }`}
        >
          {isActive ? <Pause size={14} /> : <Play size={14} />}
        </motion.button>
      </div>

      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.85 }}
        onClick={() => onRemove(todo.id)}
        className="text-[oklch(0.3_0.005_270)] transition-colors hover:text-destructive"
      >
        <X size={14} />
      </motion.button>
    </motion.div>
  );
}
