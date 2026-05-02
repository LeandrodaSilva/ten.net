export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

const todos: TodoItem[] = [
  { id: 1, text: "Review Ten.net routing", done: true },
  { id: 2, text: "Build a small TODO example", done: false },
  { id: 3, text: "Share the package on JSR", done: false },
];

let nextId = 4;

export function getTodos(): TodoItem[] {
  return todos;
}

export function addTodo(text: string) {
  const normalized = text.trim();
  if (!normalized) return;
  todos.unshift({ id: nextId++, text: normalized, done: false });
}

export function toggleTodo(id: number) {
  const item = todos.find((todo) => todo.id === id);
  if (item) item.done = !item.done;
}

export function deleteTodo(id: number) {
  const index = todos.findIndex((todo) => todo.id === id);
  if (index !== -1) todos.splice(index, 1);
}

export function renderTodoItems(): string {
  if (!todos.length) {
    return `<li class="empty">No tasks yet. Add one using the form above.</li>`;
  }

  return todos.map((todo) => {
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
  }).join("");
}
