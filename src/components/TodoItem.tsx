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
  onToggle: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onStartTimer: (id: string) => void | Promise<void>;
  onPauseTimer: (id: string) => void | Promise<void>;
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
      void onPauseTimer(todo.id);
    } else {
      void onStartTimer(todo.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "z-10" : ""}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`group relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 ${
          isActive
            ? "timer-active-glow border-primary/40 bg-primary/[0.08] shadow-md shadow-primary/10"
            : "border-border/30 bg-card shadow-sm hover:border-border/60 hover:shadow-md hover:bg-card/80"
        } ${isDragging ? "scale-[1.03] z-50 ring-2 ring-primary/40 shadow-xl" : ""}`}
      >
        <button
          {...attributes}
          {...listeners}
          className={`cursor-grab text-muted transition-colors hover:text-foreground active:cursor-grabbing ${
            isActive ? "text-primary/60" : ""
          }`}
        >
          <svg width="14" height="20" viewBox="0 0 12 16" fill="currentColor">
            <circle cx="4" cy="3" r="1.5" />
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="4" cy="13" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>

        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => void onToggle(todo.id)}
          className={`h-5 w-5 rounded-full border-2 transition-all ${
            isActive 
              ? "border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
              : "border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          }`}
        />

        <span
          className={`flex-1 text-[15px] font-medium tracking-tight transition-all duration-300 ${
            todo.completed
              ? "text-muted-foreground/50 line-through decoration-muted-foreground/30"
              : "text-foreground"
          }`}
        >
          {todo.text}
        </span>

        {/* Timer display */}
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-sm tabular-nums tracking-wider transition-colors ${
              isActive
                ? "text-primary font-bold"
                : todo.liveMs > 0
                  ? "text-muted-foreground font-medium"
                  : "text-muted-foreground/50"
            }`}
          >
            {formatTime(todo.liveMs)}
          </span>

          {isActive && (
            <motion.span 
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="timer-active-dot h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba-[var(--primary)]]" 
            />
          )}

          <div className="flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 sm:opacity-100">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleTimerClick}
              disabled={todo.completed}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                todo.completed
                  ? "cursor-not-allowed text-muted bg-muted/10"
                  : isActive
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {isActive ? <Pause size={14} className="fill-current" /> : <Play size={14} className={todo.liveMs > 0 ? "fill-current" : ""} />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
          onClick={() => onRemove(todo.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X size={15} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
