import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
import { THEMES, useTheme } from "../hooks/useTheme";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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
          className="settings-panel fixed left-1/2 top-1/2 z-50 w-52 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--settings-border)] bg-[var(--settings-bg)] p-3 shadow-xl backdrop-blur-xl"
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
        </div>
      )}
    </div>
  );
}
