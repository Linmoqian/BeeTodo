import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import {
  Clock3,
  Heart,
  Lightbulb,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TodoInput } from "../components/TodoInput";
import { TodoList } from "../components/TodoList";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useNotes } from "../hooks/useNotes";
import { usePomodoro } from "../hooks/usePomodoro";
import { emitDebugEvent } from "../lib/debugBus";
import { formatDurationHms, getDailyFocusStats } from "../lib/focusStats";
import type { FocusSession, Todo, TodoColor } from "../types";

function formatPomodoro(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function plainNote(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  focusSessions: FocusSession[];
}

export function TodayPage({ todos, totalMs, userName, focusSessions, ...actions }: TodayPageProps) {
  const navigate = useNavigate();
  const { notes, addNote } = useNotes();
  const pomodoro = usePomodoro();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const now = Date.now();

  const stats = useMemo(
    () => getDailyFocusStats(focusSessions, todos, now),
    [focusSessions, now, todos],
  );
  const latestNote = useMemo(
    () =>
      notes.reduce<(typeof notes)[number] | null>(
        (latest, note) => (!latest || note.updatedAt > latest.updatedAt ? note : latest),
        null,
      ),
    [notes],
  );
  const completedCount = todos.filter((todo) => todo.completed).length;
  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(now));
  const comparisonRising = stats.differenceMinutes >= 0;

  const createNote = () => {
    const noteId = addNote();
    emitDebugEvent("today", "已从今日页创建学习便签", "info", { noteId });
    navigate("/notes");
  };

  return (
    <motion.div
      className="page today-dashboard-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <section className="today-glass-card today-summary-card">
        <div className="today-summary-copy">
          <div className="today-date">
            <strong>今天</strong>
            <span>· {today}</span>
          </div>
          <span className="today-stat-label">{userName} 的今日任务专注</span>
          <strong className="today-focus-value">{formatDurationHms(stats.todayMs)}</strong>
          <div className={`today-comparison ${comparisonRising ? "is-rising" : "is-falling"}`}>
            {comparisonRising ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            <span>{stats.comparisonText}</span>
          </div>
        </div>
        <div className="today-summary-art" aria-hidden="true">
          <span className="bee-glow" />
          <img src="/brand/bee-avatar.png" alt="" />
        </div>
      </section>

      <section className="today-glass-card today-task-card">
        <header className="dashboard-card-heading">
          <div>
            <h2>任务清单</h2>
            <span>{todos.length - completedCount} 项待完成</span>
          </div>
          {completedCount > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="清除已完成任务"
              title="清除已完成任务"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </header>
        <div className="today-task-list">
          {todos.length > 0 ? (
            <TodoList
              todos={todos}
              variant="dashboard"
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
            <div className="today-empty-task">
              <Sparkles size={18} />
              <span>从一件小事开始</span>
            </div>
          )}
        </div>
        <TodoInput variant="dashboard" onAdd={actions.addTodo} />
        {confirmOpen ? (
          <ConfirmDialog
            title="清除已完成任务"
            description={`将永久删除 ${completedCount} 项已完成任务，且无法撤销。`}
            confirmLabel="确认清除"
            onConfirm={() => {
              setConfirmOpen(false);
              void actions.clearCompleted();
            }}
            onCancel={() => setConfirmOpen(false)}
          />
        ) : null}
      </section>

      <aside className="today-notes-column">
        <section className="today-glass-card today-note-card">
          <header className="dashboard-card-heading">
            <div>
              <h2>便签</h2>
              <span>最近更新</span>
            </div>
            <button
              type="button"
              onClick={createNote}
              aria-label="新建学习便签"
              title="新建学习便签"
            >
              <Plus size={18} />
            </button>
          </header>
          <button
            type="button"
            className="sticky-note-preview"
            onClick={() => navigate("/notes")}
            aria-label="打开最近的学习便签"
          >
            <img src="/today/sticky-note.png" alt="" />
            <span className="sticky-pin" aria-hidden="true" />
            <span className="sticky-note-copy">
              <strong>{latestNote?.title || "产品迭代方向"}</strong>
              <span>
                {latestNote
                  ? plainNote(latestNote.content).slice(0, 86)
                  : "更轻盈、更美观、更好用。把灵感记下来，再从最重要的一步开始。"}
              </span>
              <Heart size={16} />
            </span>
          </button>
        </section>

        <section className="today-glass-card inspiration-card">
          <span className="paper-tape" aria-hidden="true" />
          <Lightbulb size={19} />
          <div>
            <strong>灵感记录</strong>
            <p>让专注变得轻松有趣，像蜜蜂一样，一点点，做更多！</p>
          </div>
        </section>
      </aside>

      <section className="today-glass-card pomodoro-card">
        <header className="dashboard-card-heading">
          <div>
            <h2>专注计时</h2>
            <span>25 分钟番茄钟</span>
          </div>
          <Clock3 size={18} />
        </header>
        <div className="pomodoro-body">
          <button
            type="button"
            className="pomodoro-secondary"
            onClick={pomodoro.reset}
            aria-label="重置番茄钟"
            title="重置番茄钟"
          >
            <RotateCcw size={17} />
          </button>
          <div
            className="pomodoro-ring"
            style={{ "--pomodoro-progress": `${pomodoro.progress * 360}deg` } as CSSProperties}
          >
            <div>
              <strong>{formatPomodoro(pomodoro.remainingMs)}</strong>
              <span>
                {pomodoro.remainingMs === 0 ? "已完成" : pomodoro.isRunning ? "专注中" : "准备开始"}
              </span>
              <button
                type="button"
                onClick={pomodoro.isRunning ? pomodoro.pause : pomodoro.start}
                aria-label={pomodoro.isRunning ? "暂停番茄钟" : "开始番茄钟"}
              >
                {pomodoro.isRunning ? (
                  <Pause size={15} fill="currentColor" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
              </button>
            </div>
          </div>
          <div className="pomodoro-encouragement" aria-label="专注提示">
            <img src="/brand/bee-avatar.png" alt="" />
            <span>
              保持专注，
              <br />
              离目标更近一步！
            </span>
          </div>
        </div>
        <span className="today-total-time">累计任务专注 {formatDurationHms(totalMs)}</span>
      </section>
    </motion.div>
  );
}
