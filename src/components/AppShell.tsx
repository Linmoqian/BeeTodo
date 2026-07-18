import type { MouseEvent, ReactNode } from "react";
import { BookOpenText, CalendarDays, CheckCircle2, ListTodo, NotebookPen, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeSettings } from "./ThemeSettings";
import { isTauriRuntime, type AppSettings } from "../lib/platform";
import { WindowControls } from "./WindowControls";

const NAV_ITEMS = [
  { to: "/", label: "今日", icon: CalendarDays, end: true },
  { to: "/tasks", label: "全部任务", icon: CheckCircle2, end: false },
  { to: "/notes", label: "学习便签", icon: NotebookPen, end: false },
  { to: "/achievements", label: "成就", icon: Trophy, end: false },
  { to: "/guide", label: "使用指南", icon: BookOpenText, end: false },
];

interface AppShellProps {
  children: ReactNode;
  onSettingsChange: (settings: AppSettings) => void;
}

export function AppShell({ children, onSettingsChange }: AppShellProps) {
  const startWindowDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (!isTauriRuntime() || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (
      target.closest(
        "button, input, textarea, a, nav, [contenteditable='true'], .todo-row, .notes-workspace, .settings-sheet",
      )
    ) {
      return;
    }
    void getCurrentWindow().startDragging();
  };

  return (
    <div className="app-shell" onMouseDown={startWindowDrag}>
      <aside className="sidebar">
        <WindowControls />
        <div className="brand-mark" aria-label="BeeTodo">
          <span><ListTodo size={18} strokeWidth={2.3} /></span>
          <strong>BeeTodo</strong>
        </div>

        <nav aria-label="主要导航">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>专注当下，轻盈完成。</span>
          <ThemeSettings onSettingsChange={onSettingsChange} />
        </div>
      </aside>

      <main className="main-content">{children}</main>

      <div className="mobile-settings">
        <ThemeSettings onSettingsChange={onSettingsChange} />
      </div>

      <nav className="mobile-nav" aria-label="移动端导航">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
