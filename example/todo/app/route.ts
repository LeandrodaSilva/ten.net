const todoStore = (globalThis as any).__tennetTodoStore ??= {
  todos: [
    { id: 1, text: "Review Ten.net routing", done: true },
    { id: 2, text: "Build a small TODO example", done: false },
    { id: 3, text: "Share the package on JSR", done: false },
  ],
  nextId: 4,
};

type TodoItem = {
  id: number;
  text: string;
  done: boolean;
};

function getTodos(): Array<TodoItem> {
  return todoStore.todos;
}

function renderTodoItems(): string {
  const todos = getTodos();
  if (!todos.length) {
    return `<li class="empty">No tasks yet. Add one using the form above.</li>`;
  }

  return todos
    .map((todo: TodoItem) => {
      const labelClass = todo.done ? "done" : "";
      const toggleLabel = todo.done ? "Mark incomplete" : "Mark done";

      return `
        <li class="todo-item">
          <div>
            <strong class="${labelClass}">${todo.text}</strong>
          </div>
          <div class="actions">
            <form method="post" action="/toggle/${todo.id}">
              <button type="submit" class="primary">${toggleLabel}</button>
            </form>
            <form method="post" action="/delete/${todo.id}">
              <button type="submit">Delete</button>
            </form>
          </div>
        </li>`;
    })
    .join("");
}

export async function GET(): Promise<Response> {
  const todos = getTodos();
  const doneCount = todos.filter((todo) => todo.done).length;

  return new Response(
    JSON.stringify({
      todo_items: renderTodoItems(),
      count: todos.length,
      done_count: doneCount,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
