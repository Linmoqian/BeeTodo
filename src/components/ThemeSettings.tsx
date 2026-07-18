import { useState, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Settings, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { THEMES, useTheme } from "../hooks/useTheme";
import { closePetWindow, openPetWindow } from "../lib/petWindow";

interface AppSettings {
  alwaysOnTop: boolean;
  compactOpacity: number;
  petEnabled: boolean;
  userName: string;
  petName: string;
}

type SettingsTab = "personal" | "theme" | "window";

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "personal", label: "个性化" },
  { id: "theme", label: "主题" },
  { id: "window", label: "窗口设置" },
];

export function ThemeSettings({ onOpacityChange, onSettingsChange }: { onOpacityChange?: (v: number) => void; onSettingsChange?: (s: AppSettings) => void }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [compactOpacity, setCompactOpacity] = useState(60);
  const [petEnabled, setPetEnabled] = useState(false);
  const [userName, setUserName] = useState("龚博后");
  const [petName, setPetName] = useState("小蜜蜂");
  const [activeTab, setActiveTab] = useState<SettingsTab>("personal");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      setDragOffset({
        x: ds.origX + (e.clientX - ds.startX),
        y: ds.origY + (e.clientY - ds.startY),
      });
    };
    const onUp = () => {
      dragState.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [open]);

  const onHeaderMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: dragOffset.x,
      origY: dragOffset.y,
    };
  };

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then((settings) => {
        setAlwaysOnTop(settings.alwaysOnTop);
        setCompactOpacity(settings.compactOpacity);
        setPetEnabled(settings.petEnabled);
        setUserName(settings.userName);
        setPetName(settings.petName);
        onSettingsChange?.(settings);
      })
      .catch((error) => {
        console.error("Failed to load settings", error);
      });
  }, []);

  const toggleAlwaysOnTop = async () => {
    const enabled = !alwaysOnTop;
    setAlwaysOnTop(enabled);
    try {
      const settings = await invoke<AppSettings>("set_always_on_top", { enabled });
      setAlwaysOnTop(settings.alwaysOnTop);
    } catch (error) {
      setAlwaysOnTop(!enabled);
      console.error("Failed to set always on top", error);
    }
  };

  const togglePetWindow = async () => {
    const enabled = !petEnabled;
    setPetEnabled(enabled);
    try {
      const settings = await invoke<AppSettings>("set_pet_enabled", { enabled });
      setPetEnabled(settings.petEnabled);
      if (settings.petEnabled) {
        await openPetWindow();
      } else {
        await closePetWindow();
      }
    } catch (error) {
      setPetEnabled(!enabled);
      console.error("Failed to set pet window", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--settings-btn-hover)]"
        aria-label="设置"
      >
        <Settings size={16} className="text-[var(--settings-icon)]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="settings-panel w-[420px] rounded-xl border border-[var(--settings-border)] bg-[var(--settings-bg)] p-4 shadow-2xl"
            style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mb-3 flex cursor-move select-none items-center justify-between"
              onMouseDown={onHeaderMouseDown}
            >
              <p className="text-sm font-medium tracking-wide text-[var(--settings-text)]">
                设置
              </p>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--settings-label)] transition-colors hover:bg-[var(--settings-item-hover)] hover:text-[var(--settings-text)]"
                aria-label="关闭设置"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-4">
              {/* 侧边栏 */}
              <nav className="flex w-24 shrink-0 flex-col gap-1 border-r border-[var(--settings-border)]/60 pr-3">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary/15 font-medium text-[var(--settings-check)]"
                        : "text-[var(--settings-text)] hover:bg-[var(--settings-item-hover)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* 内容区 */}
              <div className="min-w-0 flex-1">
                {activeTab === "personal" && (
                  <div className="flex flex-col gap-3 px-0.5 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-[var(--settings-text)]">用户名</span>
                      <input
                        type="text"
                        value={userName}
                        maxLength={10}
                        onChange={async (e) => {
                          const v = e.target.value;
                          setUserName(v);
                          try {
                            const settings = await invoke<AppSettings>("set_user_name", { name: v });
                            onSettingsChange?.(settings);
                          } catch (error) {
                            console.error("Failed to set user name", error);
                          }
                        }}
                        className="ml-auto w-28 rounded-md border border-[var(--settings-border)] bg-transparent px-2 py-1 text-sm text-[var(--settings-text)] outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-[var(--settings-text)]">宠物名</span>
                      <input
                        type="text"
                        value={petName}
                        maxLength={10}
                        onChange={async (e) => {
                          const v = e.target.value;
                          setPetName(v);
                          try {
                            const settings = await invoke<AppSettings>("set_pet_name", { name: v });
                            onSettingsChange?.(settings);
                          } catch (error) {
                            console.error("Failed to set pet name", error);
                          }
                        }}
                        className="ml-auto w-28 rounded-md border border-[var(--settings-border)] bg-transparent px-2 py-1 text-sm text-[var(--settings-text)] outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "theme" && (
                  <div className="flex flex-col gap-1">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[var(--settings-item-hover)]"
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-white/10"
                          style={{ background: t.color }}
                        />
                        <span className="text-[var(--settings-text)]">
                          {t.label}
                        </span>
                        {theme === t.id && (
                          <span className="ml-auto text-[var(--settings-check)]">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "window" && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => void toggleAlwaysOnTop()}
                      className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--settings-item-hover)]"
                    >
                      <span className="text-[var(--settings-text)]">始终置顶</span>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                          alwaysOnTop
                            ? "bg-primary/20 text-[var(--settings-check)]"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {alwaysOnTop ? "开启" : "关闭"}
                      </span>
                    </button>

                    <button
                      onClick={() => void togglePetWindow()}
                      className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--settings-item-hover)]"
                    >
                      <span className="text-[var(--settings-text)]">蜜蜂桌宠</span>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                          petEnabled
                            ? "bg-primary/20 text-[var(--settings-check)]"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {petEnabled ? "开启" : "关闭"}
                      </span>
                    </button>

                    <div className="mt-1 flex flex-col gap-1.5 px-2.5 py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--settings-text)]">小窗透明度</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{compactOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={compactOpacity}
                        onChange={async (e) => {
                          const v = Number(e.target.value);
                          setCompactOpacity(v);
                          onOpacityChange?.(v);
                          try {
                            await invoke<AppSettings>("set_compact_opacity", { opacity: v });
                          } catch (error) {
                            console.error("Failed to set compact opacity", error);
                          }
                        }}
                        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
