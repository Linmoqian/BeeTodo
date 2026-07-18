import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  GripVertical,
  MoreHorizontal,
  Pause,
  Pin,
  Play,
  Trash2,
} from "lucide-react";
import type { Todo, TodoColor } from "../types";

const COLORS: Array<{ value: TodoColor; label: string }> = [
  { value: "default", label: "石墨" },
  { value: "amber", label: "琥珀" },
  { value: "rose", label: "玫瑰" },
  { value: "emerald", label: "森林" },
  { value: "sky", label: "海蓝" },
  { value: "slate", label: "雾灰" },
];

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  const pair = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pair(minutes)}:${pair(remaining)}`
    : `${pair(minutes)}:${pair(remaining)}`;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const toggleTimer = () => {
    if (todo.completed) return;
    void (isActive ? onPauseTimer(todo.id) : onStartTimer(todo.id));
  };

  return (
    <motion.article
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`todo-row todo-${todo.color} ${isActive ? "is-active" : ""} ${
        isDragging ? "is-dragging" : ""
      }`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className="drag-handle"
        aria-label={`拖动任务：${todo.text}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <button
        className={`todo-check ${todo.completed ? "is-checked" : ""}`}
        aria-label={todo.completed ? "标记为未完成" : "标记为已完成"}
        onClick={() => void onToggle(todo.id)}
      >
        {todo.completed && <Check size={13} strokeWidth={3} />}
      </button>

      <div className="todo-copy">
        <span className={todo.completed ? "is-completed" : ""}>{todo.text}</span>
        <small>{isActive ? "正在专注" : todo.liveMs > 0 ? "已记录" : "尚未开始"}</small>
      </div>

      <time className={isActive ? "is-running" : ""}>{formatTime(todo.liveMs)}</time>

      <button
        className="timer-button"
        disabled={todo.completed}
        aria-label={isActive ? "暂停计时" : "开始计时"}
        onClick={toggleTimer}
      >
        {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>

      <div className="todo-menu-wrap" ref={menuRef}>
        <button
          className="more-button"
          aria-label="更多操作"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={17} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="todo-menu"
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
            >
              <button onClick={() => void onPinTop(todo.id)}>
                <Pin size={14} /> 置顶
              </button>
              <div className="color-options" aria-label="任务颜色">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    className={`color-dot color-${color.value} ${
                      todo.color === color.value ? "is-selected" : ""
                    }`}
                    title={color.label}
                    aria-label={`设为${color.label}`}
                    onClick={() => {
                      void onSetColor(todo.id, color.value);
                      setMenuOpen(false);
                    }}
                  />
                ))}
              </div>
              <button className="danger" onClick={() => void onRemove(todo.id)}>
                <Trash2 size={14} /> 删除
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
