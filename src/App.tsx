import { lazy, Suspense, useCallback, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useTodos } from "./hooks/useTodos";
import { DEFAULT_SETTINGS, type AppSettings } from "./lib/platform";
import { TasksPage } from "./pages/TasksPage";
import { TodayPage } from "./pages/TodayPage";
import "./index.css";

const GuidePage = lazy(async () => {
  const module = await import("./pages/GuidePage");
  return { default: module.GuidePage };
});

const NotesPage = lazy(async () => {
  const module = await import("./pages/NotesPage");
  return { default: module.NotesPage };
});

const AchievementsPage = lazy(async () => {
  const module = await import("./pages/AchievementsPage");
  return { default: module.AchievementsPage };
});

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const todos = useTodos();
  const handleSettingsChange = useCallback((nextSettings: AppSettings) => {
    setSettings(nextSettings);
  }, []);

  return (
    <HashRouter>
      <AppShell onSettingsChange={handleSettingsChange}>
        <Routes>
          <Route
            path="/"
            element={
              <TodayPage
                todos={todos.todos}
                totalMs={todos.totalMs}
                userName={settings.userName}
                activeTimerId={todos.activeTimerId}
                addTodo={todos.addTodo}
                removeTodo={todos.removeTodo}
                updateTodoText={todos.updateTodoText}
                toggleTodo={todos.toggleTodo}
                startTimer={todos.startTimer}
                pauseTimer={todos.pauseTimer}
                reorderTodos={todos.reorderTodos}
                setTodoColor={todos.setTodoColor}
                pinTodoTop={todos.pinTodoTop}
              />
            }
          />
          <Route
            path="/tasks"
            element={
              <TasksPage
                todos={todos.todos}
                activeTimerId={todos.activeTimerId}
                addTodo={todos.addTodo}
                removeTodo={todos.removeTodo}
                updateTodoText={todos.updateTodoText}
                toggleTodo={todos.toggleTodo}
                startTimer={todos.startTimer}
                pauseTimer={todos.pauseTimer}
                reorderTodos={todos.reorderTodos}
                setTodoColor={todos.setTodoColor}
                pinTodoTop={todos.pinTodoTop}
              />
            }
          />
          <Route
            path="/notes"
            element={
              <Suspense fallback={<div className="route-loading">正在载入学习便签…</div>}>
                <NotesPage />
              </Suspense>
            }
          />
          <Route
            path="/achievements"
            element={
              <Suspense fallback={<div className="route-loading">正在载入成就…</div>}>
                <AchievementsPage todos={todos.todos} totalMs={todos.totalMs} />
              </Suspense>
            }
          />
          <Route
            path="/guide"
            element={
              <Suspense fallback={<div className="route-loading">正在载入指南…</div>}>
                <GuidePage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}

export default App;
