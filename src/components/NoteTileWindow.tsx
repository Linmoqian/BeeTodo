import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime, readLocalNotes } from "../lib/platform";
import type { StudyNote } from "../types";

interface NoteTileWindowProps {
  noteId: string;
}

export function NoteTileWindow({ noteId }: NoteTileWindowProps) {
  const [note, setNote] = useState<StudyNote | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setNote(readLocalNotes().find((item) => item.id === noteId) ?? null);
    };
    refresh();
    const interval = window.setInterval(refresh, 600);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, [noteId]);

  const close = async () => {
    if (isTauriRuntime()) {
      await getCurrentWindow().close();
    } else {
      window.close();
    }
  };

  const copy = async () => {
    if (!note) return;
    await navigator.clipboard.writeText(note.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <motion.main
      className="note-tile-window"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <header data-tauri-drag-region>
        <strong>{note?.title || "笔记磁贴"}</strong>
        <div>
          <button type="button" aria-label="复制笔记" onClick={() => void copy()}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button type="button" aria-label="关闭磁贴" onClick={() => void close()}>
            <X size={15} />
          </button>
        </div>
      </header>
      <article className="markdown-body">
        {note ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        ) : (
          <p>这篇笔记已不存在。</p>
        )}
      </article>
      <footer>{note?.category || "BeeTodo"}</footer>
    </motion.main>
  );
}
