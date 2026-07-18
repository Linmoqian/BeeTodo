import { motion } from "motion/react";
import { Clock3, Sparkles } from "lucide-react";
import { TodoInput } from "../components/TodoInput";
import { TodoList } from "../components/TodoList";
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
  toggleTodo: (id: string) => void | Promise<void>;
  startTimer: (id: string) => void | Promise<void>;
  pauseTimer: (id: string) => void | Promise<void>;
  reorderTodos: (activeId: string, overId: string) => void | Promise<void>;
  setTodoColor: (id: string, color: TodoColor) => void | Promise<void>;
  pinTodoTop: (id: string) => void | Promise<void>;
}

interface TodayPageProps extends TodoActions {
  todos: Todo[];
  totalMs: number;
  userName: string;
}

export function TodayPage({ todos, totalMs, userName, ...actions }: TodayPageProps) {
  const pendingTodos = todos.filter((todo) => !todo.completed);
  const completedCount = todos.length - pendingTodos.length;
  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="page-header">
        <div>
          <span className="eyebrow">{today}</span>
          <h1>{userName}，今天想完成什么？</h1>
          <p>一次专注一件事，其余交给 BeeTodo。</p>
        </div>
        <div className="focus-time" aria-label={`累计专注 ${formatTotalTime(totalMs)}`}>
          <Clock3 size={17} />
          <div>
            <span>累计专注</span>
            <strong>{formatTotalTime(totalMs)}</strong>
          </div>
        </div>
      </header>

      <TodoInput onAdd={actions.addTodo} />

      <section className="task-section">
        <div className="section-heading">
          <h2>今天</h2>
          <span>{pendingTodos.length} 项待完成</span>
        </div>
        {todos.length > 0 ? (
          <TodoList
            todos={todos}
            activeTimerId={actions.activeTimerId}
            onToggle={actions.toggleTodo}
            onRemove={actions.removeTodo}
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

      {completedCount > 0 && (
        <p className="completion-note">今天已经完成 {completedCount} 件事，做得很好。</p>
      )}
    </motion.div>
  );
}
