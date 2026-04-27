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
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "z-10" : ""}`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
          isActive
            ? "timer-active-glow bg-primary/10"
            : "bg-card hover:bg-secondary"
        } ${isDragging ? "scale-[1.02] ring-1 ring-primary/30 shadow-lg" : ""}`}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
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
          className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />

        <span
          className={`flex-1 text-sm ${
            todo.completed
              ? "text-muted-foreground line-through"
              : "text-foreground"
          }`}
        >
          {todo.text}
        </span>

        {/* Timer display */}
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-xs tabular-nums tracking-wide ${
              isActive
                ? "text-primary"
                : todo.liveMs > 0
                  ? "text-muted-foreground"
                  : "text-muted"
            }`}
          >
            {formatTime(todo.liveMs)}
          </span>

          {isActive && (
            <span className="timer-active-dot h-1.5 w-1.5 rounded-full bg-primary" />
          )}

          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleTimerClick}
            disabled={todo.completed}
            className={`transition-colors ${
              todo.completed
                ? "cursor-not-allowed text-muted"
                : isActive
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-primary"
            }`}
          >
            {isActive ? <Pause size={14} /> : <Play size={14} />}
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => onRemove(todo.id)}
          className="text-muted transition-colors hover:text-destructive"
        >
          <X size={14} />
        </motion.button>
      </motion.div>
    </div>
  );
}
