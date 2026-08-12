import { useState } from "react";
import { motion } from "motion/react";
import { Clock3, ChevronDown, Maximize2, Sparkles, Trash2 } from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TodoInput } from "../components/TodoInput";
import { TodoList } from "../components/TodoList";
import { openFocusWindow } from "../lib/focusWindow";
import type { Todo, TodoColor } from "../types";

function formatTotalTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export interface TodoActions {
  activeTimerId: string | null;
  addTodo: (text: string) => void | Promise<void>;
  removeTodo: (id: string) => void | Promise<void>;
  updateTodoText: (id: string, text: string) => void | Promise<void>;
  toggleTodo: (id: string) => void | Promise<void>;
  startTimer: (id: string) => void | Promise<void>;
  pauseTimer: (id: string) => void | Promise<void>;
  reorderTodos: (activeId: string, overId: string) => void | Promise<void>;
  setTodoColor: (id: string, color: TodoColor) => void | Promise<void>;
  pinTodoTop: (id: string) => void | Promise<void>;
  clearCompleted: () => void | Promise<void>;
}

interface TodayPageProps extends TodoActions {
  todos: Todo[];
  totalMs: number;
  userName: string;
}

export function TodayPage({ todos, totalMs, userName, ...actions }: TodayPageProps) {
  const [showCompleted, setShowCompleted] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);
  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="page-header">
        <div>
          <span className="eyebrow">{today}</span>
          <h1>{userName}，今天想完成什么？</h1>
          <p>一次专注一件事，其余交给 BeeTodo。</p>
        </div>
        <button
          type="button"
          className="focus-time"
          aria-label={`进入专注模式，累计专注 ${formatTotalTime(totalMs)}`}
          title="进入专注模式"
          onClick={() => void openFocusWindow()}
        >
          <Clock3 size={17} />
          <div>
            <span>累计专注 · 进入模式</span>
            <strong>{formatTotalTime(totalMs)}</strong>
          </div>
          <Maximize2 className="focus-entry-icon" size={13} />
        </button>
      </header>

      <TodoInput onAdd={actions.addTodo} />

      <section className="task-section">
        <div className="section-heading">
          <h2>今天</h2>
          <span>{pendingTodos.length} 项待完成</span>
        </div>
        {pendingTodos.length > 0 ? (
          <TodoList
            todos={pendingTodos}
            activeTimerId={actions.activeTimerId}
            onToggle={actions.toggleTodo}
            onRemove={actions.removeTodo}
            onUpdateText={actions.updateTodoText}
            onReorder={actions.reorderTodos}
            onStartTimer={actions.startTimer}
            onPauseTimer={actions.pauseTimer}
            onSetColor={actions.setTodoColor}
            onPinTop={actions.pinTodoTop}
          />
        ) : (
          <div className="empty-state">
            <span><Sparkles size={20} /></span>
            <h3>从一件小事开始</h3>
            <p>添加任务并开始计时，进度会自动保存在浏览器中。</p>
          </div>
        )}
      </section>

      {completedTodos.length > 0 && (
        <section className="task-section completed-section">
          <div className="section-heading">
            <button
              className="completed-toggle"
              onClick={() => setShowCompleted((value) => !value)}
              aria-expanded={showCompleted}
              aria-label={showCompleted ? "折叠已完成任务" : "展开已完成任务"}
            >
              <ChevronDown
                size={16}
                className={showCompleted ? "chevron-open" : "chevron-closed"}
              />
              <h2>已完成</h2>
              <span className="completed-count">{completedTodos.length} 项</span>
            </button>
            {showCompleted && (
              <button
                className="clear-completed-btn"
                onClick={() => setConfirmOpen(true)}
                aria-label="清除所有已完成任务"
              >
                <Trash2 size={14} />
                清除
              </button>
            )}
          </div>
          {confirmOpen && (
            <ConfirmDialog
              title="清除已完成任务"
              description={`将永久删除 ${completedTodos.length} 项已完成任务，且无法撤销。`}
              confirmLabel="确认清除"
              onConfirm={() => {
                setConfirmOpen(false);
                void actions.clearCompleted();
              }}
              onCancel={() => setConfirmOpen(false)}
            />
          )}
          {showCompleted && (
            <TodoList
              todos={completedTodos}
              activeTimerId={actions.activeTimerId}
              onToggle={actions.toggleTodo}
              onRemove={actions.removeTodo}
              onUpdateText={actions.updateTodoText}
              onReorder={actions.reorderTodos}
              onStartTimer={actions.startTimer}
              onPauseTimer={actions.pauseTimer}
              onSetColor={actions.setTodoColor}
              onPinTop={actions.pinTodoTop}
            />
          )}
        </section>
      )}
    </motion.div>
  );
}
