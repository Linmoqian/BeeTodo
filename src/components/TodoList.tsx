import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "motion/react";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { TodoItem } from "./TodoItem";
import type { Todo, TodoColor } from "../types";

interface TodoListProps {
  todos: Todo[];
  activeTimerId: string | null;
  onToggle: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onUpdateText: (id: string, text: string) => void | Promise<void>;
  onReorder: (activeId: string, overId: string) => void | Promise<void>;
  onStartTimer: (id: string) => void | Promise<void>;
  onPauseTimer: (id: string) => void | Promise<void>;
  onSetColor: (id: string, color: TodoColor) => void | Promise<void>;
  onPinTop: (id: string) => void | Promise<void>;
}

export function TodoList({
  todos,
  activeTimerId,
  onToggle,
  onRemove,
  onUpdateText,
  onReorder,
  onStartTimer,
  onPauseTimer,
  onSetColor,
  onPinTop,
}: TodoListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedId(String(event.active.id));
    setOverId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const clearDragState = () => {
    setDraggedId(null);
    setOverId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    clearDragState();
    if (over && active.id !== over.id) {
      void onReorder(String(active.id), String(over.id));
    }
  };

  const draggedTodo = todos.find((todo) => todo.id === draggedId) ?? null;
  const draggedIndex = todos.findIndex((todo) => todo.id === draggedId);
  const overIndex = todos.findIndex((todo) => todo.id === overId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDragState}
    >
      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <AnimatePresence>
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isActive={activeTimerId === todo.id}
              dropPosition={
                overId === todo.id && draggedId !== todo.id
                  ? draggedIndex < overIndex
                    ? "after"
                    : "before"
                  : null
              }
              onToggle={onToggle}
              onRemove={onRemove}
              onUpdateText={onUpdateText}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onSetColor={onSetColor}
              onPinTop={onPinTop}
            />
          ))}
        </AnimatePresence>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {draggedTodo ? (
          <div className="todo-drag-overlay">
            <GripVertical size={16} />
            <div>
              <strong>{draggedTodo.text}</strong>
              <span>移动到新位置</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
