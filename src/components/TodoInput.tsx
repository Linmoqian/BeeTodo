import { useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TodoInputProps {
  onAdd: (text: string) => void;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="添加新任务..."
        className="flex-1 border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40"
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="submit"
        className="flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus size={16} strokeWidth={2.5} />
      </motion.button>
    </form>
  );
}
