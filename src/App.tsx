import { useTodos } from "./hooks/useTodos";
import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";
import { ThemeSettings } from "./components/ThemeSettings";
import { Timer } from "lucide-react";
import "./index.css";

function formatTotalTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function App() {
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
  } = useTodos();

  const completedCount = todos.filter((t) => t.completed).length;

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
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Chronos
              </h1>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg tabular-nums tracking-widest text-primary">
              {formatTotalTime(totalMs)}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {completedCount}/{todos.length} 已完成
            </div>
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
