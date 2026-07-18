import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, Monitor, Palette, Settings, UserRound, X } from "lucide-react";
import { THEMES, useTheme } from "../hooks/useTheme";
import {
  DEFAULT_SETTINGS,
  getAppSettings,
  isTauriRuntime,
  updateAppSettings,
  type AppSettings,
} from "../lib/platform";
import { closePetWindow, openPetWindow } from "../lib/petWindow";

interface ThemeSettingsProps {
  onOpacityChange?: (value: number) => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

export function ThemeSettings({
  onOpacityChange,
  onSettingsChange,
}: ThemeSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

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
  };

  const togglePet = async () => {
    const enabled = !settings.petEnabled;
    await save("set_pet_enabled", { enabled }, { petEnabled: enabled });
    await (enabled ? openPetWindow() : closePetWindow());
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
                {isTauriRuntime() ? (
                  <>
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
                      <span className={`switch ${settings.petEnabled ? "is-on" : ""}`} />
                    </button>
                    <label className="range-row">
                      <span>小窗透明度</span>
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
                  </>
                ) : (
                  <p className="settings-note">桌面能力将在 Tauri 集成阶段启用，当前专注 Web 体验。</p>
                )}
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
