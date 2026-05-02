type TodoItem = {
  id: number;
  text: string;
  done: boolean;
};

const todoStore = ((globalThis as unknown) as {
  __tennetTodoStore: {
    todos: Array<TodoItem>;
    nextId: number;
  };
}).__tennetTodoStore ??= {
  todos: [
    { id: 1, text: "Review Ten.net routing", done: true },
    { id: 2, text: "Build a small TODO example", done: false },
    { id: 3, text: "Share the package on JSR", done: false },
  ],
  nextId: 4,
};

function toggleTodo(id: number) {
  const todo = todoStore.todos.find((item: TodoItem) => item.id === id);
  if (todo) {
    todo.done = !todo.done;
  }
}

export function POST(
  _req: Request,
  ctx: { params: Record<string, string> },
): Response {
  const id = Number(ctx.params.id);
  toggleTodo(id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
    },
  });
}
