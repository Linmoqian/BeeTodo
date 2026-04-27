import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "motion/react";
import { TodoItem } from "./TodoItem";
import type { Todo } from "../types";

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}

export function TodoList({
  todos,
  onToggle,
  onRemove,
  onReorder,
}: TodoListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <AnimatePresence mode="popLayout">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </AnimatePresence>
      </SortableContext>
    </DndContext>
  );
}