import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  Pin,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "motion/react";
import { useNotes } from "../hooks/useNotes";
import { toggleNoteTile } from "../lib/noteWindows";

type EditorMode = "edit" | "preview";

function formatUpdatedAt(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function downloadMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.trim() || "学习笔记"}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export function NotesPage() {
  const { notes, addNote, updateNote, removeNote, importNote } = useNotes();
  const [selectedId, setSelectedId] = useState<string | null>(() => notes[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<EditorMode>("edit");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return [...notes]
      .filter((note) =>
        `${note.title} ${note.category} ${note.content}`.toLocaleLowerCase().includes(normalized),
      )
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }, [notes, query]);

  const handleAdd = () => {
    setSelectedId(addNote());
    setMode("edit");
  };

  const handleDelete = () => {
    if (!selectedNote) return;
    const nextNote = notes.find((note) => note.id !== selectedNote.id);
    removeNote(selectedNote.id);
    setSelectedId(nextNote?.id ?? null);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    const title = file.name.replace(/\.md$/i, "");
    setSelectedId(importNote(title, content));
    setMode("edit");
  };

  return (
    <section className="page notes-page">
      <div className="notes-workspace">
        <aside className="notes-library" aria-label="笔记列表">
          <header className="notes-library-header">
            <div>
              <span>学习空间</span>
              <strong>学习便签</strong>
            </div>
            <button type="button" aria-label="新建笔记" title="新建笔记" onClick={handleAdd}>
              <Plus size={16} />
            </button>
          </header>
          <label className="notes-search">
            <Search size={15} />
            <span className="sr-only">搜索笔记</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题或内容"
            />
          </label>

          <div className="note-list">
            <AnimatePresence initial={false}>
              {filteredNotes.map((note) => (
                <motion.button
                  layout
                  key={note.id}
                  data-note-id={note.id}
                  type="button"
                  className={note.id === selectedId ? "note-list-item is-active" : "note-list-item"}
                  onClick={() => setSelectedId(note.id)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <strong>{note.title.trim() || "未命名笔记"}</strong>
                  <span>{note.content.replace(/[#>*_`\n-]/g, " ").trim().slice(0, 46) || "空笔记"}</span>
                  <small>{note.category || "未分类"} · {formatUpdatedAt(note.updatedAt)}</small>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          <div className="notes-import-row">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> 导入 Markdown
            </button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".md,text/markdown,text/plain"
              onChange={(event) => {
                void handleImport(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        </aside>

        <div className="note-surface">
          {selectedNote ? (
            <>
              <div className="note-toolbar">
                <div className="editor-mode" aria-label="编辑模式">
                  <button className={mode === "edit" ? "is-active" : ""} type="button" onClick={() => setMode("edit")}>编辑</button>
                  <button className={mode === "preview" ? "is-active" : ""} type="button" onClick={() => setMode("preview")}>预览</button>
                </div>
                <div className="note-actions">
                  <button type="button" aria-label="固定为桌面磁贴" title="固定为桌面磁贴" onClick={() => void toggleNoteTile(selectedNote.id)}>
                    <Pin size={16} />
                  </button>
                  <button type="button" aria-label="导出 Markdown" title="导出 Markdown" onClick={() => downloadMarkdown(selectedNote.title, selectedNote.content)}>
                    <Download size={16} />
                  </button>
                  <button className="danger" type="button" aria-label="删除笔记" title="删除笔记" onClick={handleDelete}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="note-meta">
                <input
                  className="note-title"
                  value={selectedNote.title}
                  onChange={(event) => updateNote(selectedNote.id, { title: event.target.value })}
                  aria-label="笔记标题"
                />
                <input
                  className="note-category"
                  value={selectedNote.category}
                  onChange={(event) => updateNote(selectedNote.id, { category: event.target.value })}
                  aria-label="笔记分类"
                  placeholder="分类"
                />
              </div>

              {mode === "edit" ? (
                <textarea
                  className="note-editor"
                  value={selectedNote.content}
                  onChange={(event) => updateNote(selectedNote.id, { content: event.target.value })}
                  spellCheck="false"
                  aria-label="Markdown 内容"
                />
              ) : (
                <article className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedNote.content}</ReactMarkdown>
                </article>
              )}
              <footer className="note-status">
                自动保存 · {selectedNote.content.replace(/\s/g, "").length} 字
              </footer>
            </>
          ) : (
            <div className="empty-state compact notes-empty">
              <span><FileText size={21} /></span>
              <h3>{query ? "没有匹配的笔记" : "建立你的知识碎片"}</h3>
              <p>{query ? "换一个关键词继续查找。" : "新建便签，或导入已有 Markdown 文件。"}</p>
              {!query && <button className="primary-action" type="button" onClick={handleAdd}><Plus size={15} /> 新建笔记</button>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
