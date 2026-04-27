import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light" | "pink" | "honey";

interface ThemeMeta {
  id: Theme;
  label: string;
  color: string;
}

export const THEMES: ThemeMeta[] = [
  { id: "dark", label: "暗夜", color: "oklch(0.78 0.16 75)" },
  { id: "light", label: "浅色", color: "oklch(0.45 0.02 260)" },
  { id: "pink", label: "少女粉", color: "oklch(0.72 0.19 350)" },
  { id: "honey", label: "蜜蜂黄", color: "oklch(0.82 0.17 85)" },
];

const STORAGE_KEY = "chronos-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Theme) || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}
