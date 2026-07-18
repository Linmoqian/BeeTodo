import { useState } from "react";
import { Check, FileText } from "lucide-react";
import { motion } from "motion/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNotes } from "../hooks/useNotes";
import { isTauriRuntime } from "../lib/platform";

export function QuickNoteWindow() {
  const { importNote } = useNotes();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!title.trim() && !content.trim()) return;
    importNote(title.trim() || "快捷便签", content);
    setSaved(true);
    if (isTauriRuntime()) {
      await getCurrentWindow().close();
    }
  };

  return (
    <motion.main
      className="quick-note-window"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <header data-tauri-drag-region>
        <span><FileText size={15} /> 快捷便签</span>
        <small>{saved ? "已保存" : "Ctrl + Space"}</small>
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
