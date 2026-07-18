import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { TodoList } from "../components/TodoList";
import type { Todo } from "../types";
import type { TodoActions } from "./TodayPage";

type Filter = "all" | "pending" | "completed";

interface TasksPageProps extends TodoActions {
  todos: Todo[];
}

export function TasksPage({ todos, ...actions }: TasksPageProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const filteredTodos = todos.filter((todo) => {
    if (filter === "pending") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="page-header compact">
        <div>
          <span className="eyebrow">任务库</span>
          <h1>全部任务</h1>
          <p>回顾计划，保持列表清晰。</p>
        </div>
      </header>

      <div className="filter-control" aria-label="筛选任务">
        {(["all", "pending", "completed"] as Filter[]).map((item) => (
          <button
            key={item}
            className={filter === item ? "is-active" : ""}
            onClick={() => setFilter(item)}
          >
            {{ all: "全部", pending: "进行中", completed: "已完成" }[item]}
          </button>
        ))}
      </div>

      {filteredTodos.length > 0 ? (
        <TodoList
          todos={filteredTodos}
          activeTimerId={actions.activeTimerId}
          onToggle={actions.toggleTodo}
          onRemove={actions.removeTodo}
          onReorder={actions.reorderTodos}
          onStartTimer={actions.startTimer}
          onPauseTimer={actions.pauseTimer}
          onSetColor={actions.setTodoColor}
          onPinTop={actions.pinTodoTop}
        />
      ) : (
        <div className="empty-state compact">
          <span><CheckCircle2 size={20} /></span>
          <h3>这里很清爽</h3>
          <p>当前筛选条件下没有任务。</p>
        </div>
      )}
    </motion.div>
  );
}
