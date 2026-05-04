import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
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

export function ThemeSettings({ onOpacityChange, onSettingsChange }: { onOpacityChange?: (v: number) => void; onSettingsChange?: (s: AppSettings) => void }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [compactOpacity, setCompactOpacity] = useState(60);
  const [petEnabled, setPetEnabled] = useState(false);
  const [userName, setUserName] = useState("龚博后");
  const [petName, setPetName] = useState("小蜜蜂");
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--settings-btn-hover)]"
        aria-label="设置"
      >
        <Settings size={16} className="text-[var(--settings-icon)]" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="settings-panel fixed left-1/2 top-1/2 z-50 w-60 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--settings-border)] bg-[var(--settings-bg)] p-3 shadow-xl backdrop-blur-xl"
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-widest text-[var(--settings-label)]">
            主题
          </p>
          <div className="flex flex-col gap-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
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

          <div className="my-3 h-px bg-[var(--settings-border)]/80" />

          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-widest text-[var(--settings-label)]">
            个性化
          </p>
          <div className="flex flex-col gap-2 px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[var(--settings-text)] text-sm shrink-0">用户名</span>
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
                className="ml-auto w-24 rounded-md border border-[var(--settings-border)] bg-transparent px-2 py-1 text-sm text-[var(--settings-text)] outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--settings-text)] text-sm shrink-0">宠物名</span>
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
                className="ml-auto w-24 rounded-md border border-[var(--settings-border)] bg-transparent px-2 py-1 text-sm text-[var(--settings-text)] outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="my-3 h-px bg-[var(--settings-border)]/80" />

          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-widest text-[var(--settings-label)]">
            窗口
          </p>
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

          <div className="mt-1.5 flex flex-col gap-1.5 px-2.5 py-1">
            <div className="flex items-center justify-between">
              <span className="text-[var(--settings-text)] text-sm">小窗透明度</span>
              <span className="text-xs text-muted-foreground tabular-nums">{compactOpacity}%</span>
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
  );
}
