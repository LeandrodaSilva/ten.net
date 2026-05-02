const todoStore = (globalThis as any).__tennetTodoStore ??= {
  todos: [
    { id: 1, text: "Review Ten.net routing", done: true },
    { id: 2, text: "Build a small TODO example", done: false },
    { id: 3, text: "Share the package on JSR", done: false },
  ],
  nextId: 4,
};

function toggleTodo(id: number) {
  const todo = todoStore.todos.find((item: { id: number }) => item.id === id);
  if (todo) {
    todo.done = !todo.done;
  }
}

export async function POST(
  _req: Request,
  ctx: { params: Record<string, string> },
): Promise<Response> {
  const id = Number(ctx.params.id);
  toggleTodo(id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
    },
  });
}
