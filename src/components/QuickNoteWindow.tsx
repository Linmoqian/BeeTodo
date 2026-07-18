import { useEffect, useState } from "react";
import { Check, FileText, X } from "lucide-react";
import { motion } from "motion/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNotes } from "../hooks/useNotes";
import { DEFAULT_SETTINGS, getAppSettings, isTauriRuntime } from "../lib/platform";

export function QuickNoteWindow() {
  const { importNote } = useNotes();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shortcut, setShortcut] = useState(DEFAULT_SETTINGS.quickNoteShortcut);

  const close = async () => {
    if (isTauriRuntime()) {
      await getCurrentWindow().close();
    } else {
      setDismissed(true);
    }
  };

  useEffect(() => {
    void getAppSettings().then((settings) => setShortcut(settings.quickNoteShortcut));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !title.trim() && !content.trim()) {
        event.preventDefault();
        void close();
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const save = async () => {
    if (!title.trim() && !content.trim()) return;
    importNote(title.trim() || "快捷便签", content);
    setSaved(true);
    if (isTauriRuntime()) {
      await getCurrentWindow().close();
    }
  };

  if (dismissed) return null;

  return (
    <motion.main
      className="quick-note-window"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <header data-tauri-drag-region>
        <span><FileText size={15} /> 快捷便签</span>
        <div>
          <small>{saved ? "已保存" : shortcut}</small>
          <button type="button" aria-label="关闭快捷便签" title="关闭" onClick={() => void close()}>
            <X size={14} />
          </button>
        </div>
      </header>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="标题"
        aria-label="快捷便签标题"
        autoFocus
      />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="记录此刻的想法…"
        aria-label="快捷便签内容"
      />
      <footer>
        <span>支持 Markdown</span>
        <button type="button" disabled={!title.trim() && !content.trim()} onClick={() => void save()}>
          <Check size={15} /> 保存
        </button>
      </footer>
    </motion.main>
  );
}
