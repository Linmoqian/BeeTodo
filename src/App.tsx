import { useState, useEffect, useRef } from "react";
import { LogicalSize, type PhysicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTodos } from "./hooks/useTodos";
import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";
import { ThemeSettings } from "./components/ThemeSettings";
import { Maximize2, Minimize2, Pause, Play, Timer } from "lucide-react";
import "./index.css";

function formatTotalTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function useCurrentTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

function App() {
  const normalWindowSizeRef = useRef<PhysicalSize | null>(null);
  const [compactMode, setCompactMode] = useState(false);
  const {
    todos,
    totalMs,
    activeTimerId,
    addTodo,
    removeTodo,
    toggleTodo,
    startTimer,
    pauseTimer,
    reorderTodos,
    setTodoColor,
    pinTodoTop,
  } = useTodos();

  const currentTime = useCurrentTime();
  const timeString = currentTime.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

  const completedCount = todos.filter((t) => t.completed).length;
  const activeTodo = todos.find((todo) => todo.id === activeTimerId) ?? null;
  const lastActiveTodoRef = useRef(activeTodo);
  if (activeTodo) lastActiveTodoRef.current = activeTodo;
  const compactTodo = activeTodo ?? lastActiveTodoRef.current;
  const setCompactWindowMode = async (enabled: boolean) => {
    setCompactMode(enabled);

    try {
      const currentWindow = getCurrentWindow();
      if (enabled) {
        normalWindowSizeRef.current = await currentWindow.innerSize();
        await currentWindow.setAlwaysOnTop(true);
        await currentWindow.setDecorations(false);
        await currentWindow.setResizable(false);
        await currentWindow.setMaximizable(false);
        await currentWindow.setSize(new LogicalSize(360, 110));
        return;
      }

      const normalSize = normalWindowSizeRef.current;
      await currentWindow.setAlwaysOnTop(false);
      await currentWindow.setResizable(true);
      await currentWindow.setMaximizable(true);
      await currentWindow.setDecorations(true);
      await currentWindow.setSize(normalSize ?? new LogicalSize(800, 600));
    } catch (error) {
      console.error("Failed to update compact window mode", error);
    }
  };

  if (compactMode) {
    return (
      <div
        className="compact-window flex min-h-screen flex-col items-center bg-background text-foreground selection:bg-primary/30"
        data-tauri-drag-region
      >
        <div className="relative mt-2 flex w-full items-center justify-center">
          <div className="h-[3px] w-8 rounded-full bg-foreground/15" />
          <button
            type="button"
            onClick={() => void setCompactWindowMode(false)}
            className="absolute right-4 flex h-4 w-4 items-center justify-center text-foreground/15 transition-colors hover:text-foreground/40"
            aria-label="恢复完整窗口"
            title="恢复"
          >
            <Maximize2 size={11} />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <div className="font-mono text-3xl leading-none tabular-nums tracking-widest text-primary">
            {formatTotalTime(compactTodo?.liveMs ?? 0)}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="truncate max-w-60 text-[11px] text-muted-foreground">
              {compactTodo?.text ?? "暂无任务"}
            </p>
            {compactTodo && (
              <button
                type="button"
                onClick={() => void (activeTimerId ? pauseTimer(compactTodo.id) : startTimer(compactTodo.id))}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label={activeTimerId ? "暂停计时" : "继续计时"}
                title={activeTimerId ? "暂停" : "继续"}
              >
                {activeTimerId ? <Pause size={10} className="fill-current" /> : <Play size={10} className="fill-current" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="noise-bg relative min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col px-6 py-12">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <ThemeSettings />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Timer size={16} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg flex items-center gap-2 font-semibold tracking-tight text-foreground">
                龚博后专用
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                BeeTODO
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className="font-mono text-xs tabular-nums tracking-widest text-muted-foreground opacity-80 mb-0.5">
                {timeString}
              </div>
              <div className="font-mono text-lg leading-none tabular-nums tracking-widest text-primary">
                {formatTotalTime(totalMs)}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                {completedCount}/{todos.length} 已完成
              </div>
            </div>
            <button
              type="button"
              onClick={() => void setCompactWindowMode(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--settings-btn-hover)] hover:text-foreground"
              aria-label="切换小窗模式"
              title="小窗模式"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        </header>

        {/* Separator */}
        <div className="mb-6 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

        {/* Input */}
        <TodoInput onAdd={addTodo} />

        {/* Todo list */}
        <div className="mt-8 flex flex-col gap-3">
          <TodoList
            todos={todos}
            activeTimerId={activeTimerId}
            onToggle={toggleTodo}
            onRemove={removeTodo}
            onReorder={reorderTodos}
            onStartTimer={startTimer}
            onPauseTimer={pauseTimer}
            onSetColor={setTodoColor}
            onPinTop={pinTodoTop}
          />
        </div>

        {/* Empty state */}
        {todos.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card">
              <Timer size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              添加任务，开始追踪时间
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
