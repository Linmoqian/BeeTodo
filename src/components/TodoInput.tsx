import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUp } from "lucide-react";

interface TodoInputProps {
  onAdd: (text: string) => void | Promise<void>;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextText = text.trim();
    if (!nextText) return;
    void onAdd(nextText);
    setText("");
  };

  return (
    <form className="task-composer" onSubmit={handleSubmit} autoComplete="off">
      <label className="sr-only" htmlFor="new-task">
        添加任务
      </label>
      <input
        id="new-task"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="接下来要做什么？"
        spellCheck={false}
      />
      <motion.button
        type="submit"
        aria-label="添加任务"
        disabled={!text.trim()}
        whileTap={{ scale: 0.92 }}
      >
        <ArrowUp size={17} strokeWidth={2.4} />
      </motion.button>
    </form>
  );
}
