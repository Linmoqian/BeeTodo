import { useTodos } from "./hooks/useTodos";
import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";
import "./index.css";

function App() {
  const { todos, addTodo, removeTodo, toggleTodo, reorderTodos } = useTodos();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-pink-100 via-purple-50 to-purple-100">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-4 py-12">
        <div className="rounded-2xl bg-white/70 p-6 shadow-xl backdrop-blur-xl">
          <h1 className="mb-6 text-center text-2xl font-bold text-purple-600">
            My Todo
          </h1>
          <TodoInput onAdd={addTodo} />
          <div className="mt-4 flex flex-col gap-2">
            <TodoList
              todos={todos}
              onToggle={toggleTodo}
              onRemove={removeTodo}
              onReorder={reorderTodos}
            />
          </div>
          {todos.length === 0 && (
            <p className="mt-6 text-center text-sm text-gray-400">
              还没有任务，添加一个吧 ✨
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
