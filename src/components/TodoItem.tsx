import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowUp, Palette, Pause, Play, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Todo, TodoColor } from "../types";

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
  onSetColor: (id: string, color: TodoColor) => void | Promise<void>;
  onPinTop: (id: string) => void | Promise<void>;
}

const COLOR_OPTIONS: Array<{
  value: TodoColor;
  label: string;
  dotClassName: string;
}> = [
  { value: "default", label: "默认", dotClassName: "bg-card border border-border" },
  { value: "amber", label: "琥珀", dotClassName: "bg-amber-400" },
  { value: "rose", label: "玫瑰", dotClassName: "bg-rose-400" },
  { value: "emerald", label: "翡翠", dotClassName: "bg-emerald-400" },
  { value: "sky", label: "天空", dotClassName: "bg-sky-400" },
  { value: "slate", label: "石墨", dotClassName: "bg-slate-400" },
];

function getCardColorClass(color: TodoColor): string {
  switch (color) {
    case "amber":
      return "border-amber-400/50 bg-amber-400/[0.10] hover:bg-amber-400/[0.15]";
    case "rose":
      return "border-rose-400/50 bg-rose-400/[0.10] hover:bg-rose-400/[0.15]";
    case "emerald":
      return "border-emerald-400/50 bg-emerald-400/[0.10] hover:bg-emerald-400/[0.15]";
    case "sky":
      return "border-sky-400/50 bg-sky-400/[0.10] hover:bg-sky-400/[0.15]";
    case "slate":
      return "border-slate-400/50 bg-slate-400/[0.12] hover:bg-slate-400/[0.16]";
    default:
      return "border-border/30 bg-card hover:border-border/60 hover:shadow-md hover:bg-card/80";
  }
}

export function TodoItem({
  todo,
  isActive,
  onToggle,
  onRemove,
  onStartTimer,
  onPauseTimer,
  onSetColor,
  onPinTop,
}: TodoItemProps) {
  const SWIPE_TRIGGER = 64;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  
  // Left side background (revealed when swiping right, x > 0)
  const deleteOpacity = useTransform(x, [0, SWIPE_TRIGGER], [0, 1], { clamp: true });
  const deleteScale = useTransform(x, [0, SWIPE_TRIGGER], [0.8, 1], { clamp: true });

  // Right side background (revealed when swiping left, x < 0)
  const pinOpacity = useTransform(x, [0, -SWIPE_TRIGGER], [0, 1], { clamp: true });
  const pinScale = useTransform(x, [0, -SWIPE_TRIGGER], [0.8, 1], { clamp: true });

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
  const colorClass = getCardColorClass(todo.color);

  const handleTimerClick = () => {
    if (todo.completed) return;
    if (isActive) {
      void onPauseTimer(todo.id);
    } else {
      void onStartTimer(todo.id);
    }
  };

  const openContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const applyColor = (color: TodoColor) => {
    void onSetColor(todo.id, color);
    setMenuOpen(false);
  };

  const handleDragEnd = async (_: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const speed = Math.abs(velocity);
    
    // Decrease threshold if swiping fast
    const threshold = speed > 500 ? SWIPE_TRIGGER / 2 : SWIPE_TRIGGER;

    if (offset > threshold) {
      // Swipe Right -> Delete
      await animate(x, window.innerWidth, { duration: 0.2, ease: "easeOut" });
      void onRemove(todo.id);
    } else if (offset < -threshold) {
      // Swipe Left -> Pin
      await animate(x, 0, { type: "spring", bounce: 0.4, duration: 0.5 });
      void onPinTop(todo.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-2xl ${isDragging ? "z-10" : ""}`}
    >
      {/* Background left actions (delete) */}
      <motion.div
        className="absolute inset-y-0 left-0 flex w-full items-center bg-destructive/15 px-4"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md"
          style={{ scale: deleteScale }}
        >
          <Trash2 size={20} strokeWidth={2.5} />
        </motion.div>
      </motion.div>

      {/* Background right actions (pin) */}
      <motion.div
        className="absolute inset-y-0 right-0 flex w-full items-center justify-end bg-primary/15 px-4"
        style={{ opacity: pinOpacity }}
      >
        <motion.div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
          style={{ scale: pinScale }}
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        dragDirectionLock
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onContextMenu={openContextMenu}
        title="右键设置颜色"
        className={`touch-pan-y group relative select-none flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 ${colorClass} ${
          isActive
            ? "timer-active-glow shadow-md shadow-primary/10"
            : "shadow-sm"
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
              {isActive ? (
                <Pause size={14} className="fill-current" />
              ) : (
                <Play
                  size={14}
                  className={todo.liveMs > 0 ? "fill-current" : ""}
                />
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/10 hover:text-primary"
              title="设置颜色"
            >
              <Palette size={15} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => void onRemove(todo.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X size={15} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {menuOpen && (
        <div
          ref={menuRef}
          style={{ left: menuPos.x, top: menuPos.y }}
          className="fixed z-[100] min-w-36 -translate-y-1 rounded-xl border border-[var(--settings-border)] bg-[var(--settings-bg)] p-1.5 shadow-xl backdrop-blur-xl"
        >
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => applyColor(option.value)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--settings-text)] transition-colors hover:bg-[var(--settings-item-hover)]"
            >
              <span className={`h-3 w-3 rounded-full ${option.dotClassName}`} />
              <span>{option.label}</span>
              {todo.color === option.value && (
                <span className="ml-auto text-[var(--settings-check)]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
