import type { MouseEvent, ReactNode } from "react";
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Heart,
  NotebookPen,
  Sparkles,
  TimerReset,
  Trophy,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeSettings } from "./ThemeSettings";
import { isTauriRuntime, getOsPlatform, updateAppSettings, type AppSettings } from "../lib/platform";
import { WindowControls } from "./WindowControls";
import { AppContextMenu } from "./AppContextMenu";
import { MobilePin } from "./MobilePin";
import { openFocusWindow } from "../lib/focusWindow";
import { closePetWindow, openPetWindow } from "../lib/petWindow";
import { emitDebugEvent } from "../lib/debugBus";
import { calculateRoleProgress } from "../lib/focusStats";

const NAV_ITEMS = [
  { to: "/", label: "今日", icon: CalendarDays, end: true },
  { to: "/tasks", label: "全部任务", icon: CheckCircle2, end: false },
  { to: "/notes", label: "学习便签", icon: NotebookPen, end: false },
  { to: "/achievements", label: "成就", icon: Trophy, end: false },
  { to: "/guide", label: "使用指南", icon: BookOpenText, end: false },
];

interface AppShellProps {
  children: ReactNode;
  settings: AppSettings;
  totalMs: number;
  onSettingsChange: (settings: AppSettings) => void;
}

export function AppShell({ children, settings, totalMs, onSettingsChange }: AppShellProps) {
  const role = calculateRoleProgress(Math.floor(totalMs / 60_000));
  const os = getOsPlatform();

  const togglePet = async () => {
    const enabled = !settings.petEnabled;
    const nextSettings = await updateAppSettings(
      "set_pet_enabled",
      { enabled },
      { petEnabled: enabled },
    );
    await (enabled ? openPetWindow() : closePetWindow());
    onSettingsChange(nextSettings);
    emitDebugEvent("sidebar", enabled ? "桌宠已开启" : "桌宠已关闭");
  };

  const startWindowDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (!isTauriRuntime() || event.button !== 0) return;
    const { target } = event;
    if (!(target instanceof Element)) return;
    if (
      target.closest(
        "button, input, textarea, select, a, label, nav, [contenteditable='true'], [role], .todo-row, .notes-workspace, .settings-sheet, .main-content",
      )
    ) {
      return;
    }
    event.preventDefault();
    void getCurrentWindow()
      .startDragging()
      .catch((error) => {
        console.error("Failed to start window dragging", error);
      });
  };

  return (
    <div className="app-shell" data-os={os} onMouseDown={startWindowDrag}>
      <aside className="sidebar">
        {os !== "windows" && <WindowControls />}
        <div className="brand-mark" aria-label="BeeTodo" data-tauri-drag-region>
          <img src="/brand/bee-logo.png" alt="" data-tauri-drag-region />
          <strong data-tauri-drag-region>
            <span>Bee</span>Todo
          </strong>
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
          <section className="character-card" aria-label={`${settings.petName}角色信息`}>
            <header>
              <img src="/brand/bee-avatar.png" alt={settings.petName} />
              <div>
                <strong>
                  {settings.userName} · {settings.petName}
                </strong>
                <span>
                  今天也要加油哦！ <Heart size={11} fill="currentColor" />
                </span>
              </div>
            </header>
            <div
              className="character-progress"
              role="progressbar"
              aria-label={`等级 ${role.level} 经验进度`}
              aria-valuemin={0}
              aria-valuemax={role.targetExperience}
              aria-valuenow={role.currentExperience}
            >
              <span style={{ width: `${role.progress * 100}%` }} />
            </div>
            <div className="character-level">
              <strong>Lv.{role.level}</strong>
              <span>
                {role.currentExperience} / {role.targetExperience}
              </span>
            </div>
            <div className="character-actions">
              <button
                type="button"
                onClick={() => void openFocusWindow()}
                aria-label="打开专注模式"
                title="打开专注模式"
              >
                <TimerReset size={16} />
              </button>
              <button
                type="button"
                onClick={() => void togglePet()}
                aria-label={settings.petEnabled ? "关闭桌宠" : "开启桌宠"}
                title={settings.petEnabled ? "关闭桌宠" : "开启桌宠"}
              >
                <Sparkles size={16} />
              </button>
              <ThemeSettings onSettingsChange={onSettingsChange} />
            </div>
          </section>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      {os === "windows" && <WindowControls />}

      <div className="mobile-settings">
        <ThemeSettings onSettingsChange={onSettingsChange} />
      </div>

      <MobilePin />

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
      <AppContextMenu />
    </div>
  );
}
