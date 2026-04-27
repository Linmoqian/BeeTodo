import { useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TodoInputProps {
  onAdd: (text: string) => void | Promise<void>;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    void onAdd(trimmed);
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center overflow-hidden rounded-2xl border border-border/40 bg-card p-1 shadow-sm transition-shadow focus-within:border-primary/50 focus-within:shadow-md"
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="添加新任务..."
        className="flex-1 border-0 bg-transparent px-4 text-base shadow-none outline-none focus-visible:ring-0"
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="submit"
        className="mr-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        <Plus size={20} strokeWidth={2.5} />
      </motion.button>
    </form>
  );
}
