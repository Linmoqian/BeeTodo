import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  ListPlus,
  Minimize2,
  NotebookPen,
  Trophy,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "../lib/platform";

interface MenuPosition {
  x: number;
  y: number;
}

const MENU_WIDTH = 188;
const MENU_HEIGHT = 314;

export function AppContextMenu() {
  const navigate = useNavigate();
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useEffect(() => {
    const openMenu = (event: MouseEvent) => {
      event.preventDefault();
      setPosition({
        x: Math.max(8, Math.min(event.clientX, window.innerWidth - MENU_WIDTH - 8)),
        y: Math.max(8, Math.min(event.clientY, window.innerHeight - MENU_HEIGHT - 8)),
      });
    };
    const closeMenu = () => setPosition(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("contextmenu", openMenu);
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("contextmenu", openMenu);
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const goTo = (path: string) => {
    navigate(path);
    setPosition(null);
  };

  const createTodo = () => {
    navigate("/");
    setPosition(null);
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('.task-composer input')?.focus();
    }, 60);
  };

  const minimize = async () => {
    setPosition(null);
    await getCurrentWindow().minimize();
  };

  const hideToTray = async () => {
    setPosition(null);
    await getCurrentWindow().hide();
  };

  return createPortal(
    <AnimatePresence>
      {position && (
        <motion.div
          className="app-context-menu"
          role="menu"
          aria-label="应用快捷菜单"
          style={{ left: position.x, top: position.y }}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -2 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={createTodo}>
            <ListPlus size={15} />
            <span>新建待办</span>
          </button>
          <div className="app-context-separator" />
          <button type="button" role="menuitem" onClick={() => goTo("/")}>
            <CalendarDays size={15} />
            <span>今日</span>
          </button>
          <button type="button" role="menuitem" onClick={() => goTo("/tasks")}>
            <CheckCircle2 size={15} />
            <span>全部任务</span>
          </button>
          <button type="button" role="menuitem" onClick={() => goTo("/notes")}>
            <NotebookPen size={15} />
            <span>学习便签</span>
          </button>
          <button type="button" role="menuitem" onClick={() => goTo("/achievements")}>
            <Trophy size={15} />
            <span>成就</span>
          </button>
          {isTauriRuntime() && (
            <>
              <div className="app-context-separator" />
              <button type="button" role="menuitem" onClick={() => void minimize()}>
                <Minimize2 size={15} />
                <span>最小化</span>
              </button>
              <button type="button" role="menuitem" onClick={() => void hideToTray()}>
                <X size={15} />
                <span>隐藏到托盘</span>
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
