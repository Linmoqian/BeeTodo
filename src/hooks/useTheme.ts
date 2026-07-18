import { useState, useEffect, useCallback } from "react";

export type Theme =
  | "dark"
  | "light"
  | "pink"
  | "honey"
  | "ocean"
  | "sage"
  | "lavender"
  | "coral";

interface ThemeMeta {
  id: Theme;
  label: string;
  color: string;
}

export const THEMES: ThemeMeta[] = [
  { id: "light", label: "明亮", color: "#f5f5f7" },
  { id: "dark", label: "深色", color: "#1c1c1e" },
  { id: "honey", label: "暖阳", color: "#f4c752" },
  { id: "pink", label: "雾粉", color: "#e7b7c8" },
  { id: "ocean", label: "海蓝", color: "#79aeca" },
  { id: "sage", label: "森绿", color: "#92aa8a" },
  { id: "lavender", label: "暮紫", color: "#a997ca" },
  { id: "coral", label: "珊瑚", color: "#e79782" },
];

const STORAGE_KEY = "beetodo-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Theme) || "light";
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
