import { useEffect, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Monitor,
  Palette,
  RefreshCw,
  Settings,
  StickyNote,
  TimerReset,
  UserRound,
  X,
} from "lucide-react";
import { THEMES, useTheme } from "../hooks/useTheme";
import {
  DEFAULT_SETTINGS,
  getAppSettings,
  isTauriRuntime,
  updateAppSettings,
  type AppSettings,
} from "../lib/platform";
import { openFocusWindow } from "../lib/focusWindow";
import { openQuickNoteWindow } from "../lib/noteWindows";
import { UpdateSettings } from "./UpdateSettings";

interface ThemeSettingsProps {
  petEnabled?: boolean;
  onOpacityChange?: (value: number) => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

export function ThemeSettings({
  petEnabled: petEnabledOverride,
  onOpacityChange,
  onSettingsChange,
}: ThemeSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [shortcutError, setShortcutError] = useState("");
  const [recordingShortcut, setRecordingShortcut] = useState(false);
  const petEnabled = petEnabledOverride ?? settings.petEnabled;

  useEffect(() => {
    void getAppSettings().then((nextSettings) => {
      setSettings(nextSettings);
      onSettingsChange?.(nextSettings);
    });
  }, [onSettingsChange]);

  const save = async (
    command: string,
    args: Record<string, unknown>,
    patch: Partial<AppSettings>,
  ) => {
    const nextSettings = await updateAppSettings(command, args, patch);
    setSettings(nextSettings);
    onSettingsChange?.(nextSettings);
    return nextSettings;
  };

  const togglePet = async () => {
    const enabled = !petEnabled;
    await save("set_pet_enabled", { enabled }, { petEnabled: enabled });
  };

  const saveShortcut = async (shortcut: string) => {
    setSettings((current) => ({ ...current, quickNoteShortcut: shortcut }));
    try {
      await save(
        "set_quick_note_shortcut",
        { shortcut },
        { quickNoteShortcut: shortcut },
      );
      setShortcutError("");
    } catch {
      setShortcutError("快捷键不可用，请换一个组合");
      const currentSettings = await getAppSettings();
      setSettings(currentSettings);
    }
  };

  const recordShortcut = (event: KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;

    const modifiers = [
      event.ctrlKey || event.metaKey ? "CommandOrControl" : "",
      event.altKey ? "Alt" : "",
      event.shiftKey ? "Shift" : "",
    ].filter(Boolean);
    if (modifiers.length === 0) {
      setShortcutError("请至少包含一个修饰键，例如 Ctrl、⌘、Alt 或 Shift");
      return;
    }

    const keyNames: Record<string, string> = { " ": "Space" };
    const key =
      keyNames[event.key] ??
      (event.key.length === 1 ? event.key.toUpperCase() : event.key);
    setRecordingShortcut(false);
    void saveShortcut([...modifiers, key].join("+"));
  };

  return (
    <>
      <button className="icon-button" onClick={() => setOpen(true)} aria-label="设置">
        <Settings size={17} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              <motion.section
                className="settings-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                onClick={(event) => event.stopPropagation()}
              >
                <header>
                <div>
                  <span className="eyebrow">偏好设置</span>
                  <h2 id="settings-title">让 BeeTodo 更适合你</h2>
                </div>
                <button className="icon-button" onClick={() => setOpen(false)} aria-label="关闭设置">
                  <X size={17} />
                </button>
                </header>

              <div className="settings-group">
                <div className="settings-label">
                  <UserRound size={16} />
                  <span>个人信息</span>
                </div>
                <label className="field-row">
                  <span>称呼</span>
                  <input
                    value={settings.userName}
                    maxLength={12}
                    onChange={(event) => {
                      const userName = event.target.value;
                      setSettings((current) => ({ ...current, userName }));
                    }}
                    onBlur={() =>
                      void save(
                        "set_user_name",
                        { name: settings.userName },
                        { userName: settings.userName },
                      )
                    }
                  />
                </label>
              </div>

              <div className="settings-group">
                <div className="settings-label">
                  <Palette size={16} />
                  <span>外观</span>
                </div>
                <div className="theme-grid">
                  {THEMES.map((item) => (
                    <button
                      key={item.id}
                      className={theme === item.id ? "is-selected" : ""}
                      onClick={() => setTheme(item.id)}
                    >
                      <span style={{ background: item.color }} />
                      {item.label}
                      {theme === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-label">
                  <Monitor size={16} />
                  <span>桌面</span>
                </div>
                {isTauriRuntime() && (
                  <div className="desktop-actions">
                    <button className="action-row" onClick={() => void openQuickNoteWindow()}>
                      <span>快捷便签</span>
                      <StickyNote size={15} />
                    </button>
                    <button className="action-row" onClick={() => void openFocusWindow()}>
                      <span>打开专注磁贴</span>
                      <TimerReset size={15} />
                    </button>
                    <button
                      className="switch-row"
                      onClick={() =>
                        void save(
                          "set_always_on_top",
                          { enabled: !settings.alwaysOnTop },
                          { alwaysOnTop: !settings.alwaysOnTop },
                        )
                      }
                    >
                      <span>始终置顶</span>
                      <span className={`switch ${settings.alwaysOnTop ? "is-on" : ""}`} />
                    </button>
                    <button className="switch-row" onClick={() => void togglePet()}>
                      <span>蜜蜂桌宠</span>
                      <span className={`switch ${petEnabled ? "is-on" : ""}`} />
                    </button>
                  </div>
                )}
                <div className="desktop-options">
                  <label className="field-row shortcut-field">
                    <span>快捷便签快捷键</span>
                    <input
                      value={settings.quickNoteShortcut}
                      placeholder="Ctrl+Space"
                      aria-label="快捷便签快捷键"
                      readOnly
                      className={recordingShortcut ? "is-recording" : ""}
                      onClick={() => {
                        setShortcutError("");
                        setRecordingShortcut(true);
                      }}
                      onKeyDown={recordShortcut}
                      onBlur={() => setRecordingShortcut(false)}
                    />
                  </label>
                  <p className="settings-hint">
                    {recordingShortcut ? "请按下新的组合键" : "点击后按下组合键即可修改"}
                  </p>
                  {shortcutError && <p className="settings-error">{shortcutError}</p>}
                  <label className="range-row">
                    <span>磁贴透明度 <small>{settings.compactOpacity}%</small></span>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={settings.compactOpacity}
                      onChange={(event) => {
                        const compactOpacity = Number(event.target.value);
                        setSettings((current) => ({ ...current, compactOpacity }));
                        onOpacityChange?.(compactOpacity);
                      }}
                      onMouseUp={() =>
                        void save(
                          "set_compact_opacity",
                          { opacity: settings.compactOpacity },
                          { compactOpacity: settings.compactOpacity },
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-label">
                  <RefreshCw size={16} />
                  <span>版本更新</span>
                </div>
                <UpdateSettings />
              </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
