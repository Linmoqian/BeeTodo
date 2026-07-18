import type { ReactNode } from "react";
import { BookOpenText, CalendarDays, CheckCircle2, ListTodo, NotebookPen } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ThemeSettings } from "./ThemeSettings";
import type { AppSettings } from "../lib/platform";

const NAV_ITEMS = [
  { to: "/", label: "今日", icon: CalendarDays, end: true },
  { to: "/tasks", label: "全部任务", icon: CheckCircle2, end: false },
  { to: "/notes", label: "学习便签", icon: NotebookPen, end: false },
  { to: "/guide", label: "使用指南", icon: BookOpenText, end: false },
];

interface AppShellProps {
  children: ReactNode;
  onSettingsChange: (settings: AppSettings) => void;
}

export function AppShell({ children, onSettingsChange }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
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
