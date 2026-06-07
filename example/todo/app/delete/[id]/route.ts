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

function deleteTodo(id: number) {
  const index = todoStore.todos.findIndex((item: TodoItem) => item.id === id);
  if (index !== -1) {
    todoStore.todos.splice(index, 1);
  }
}

export function POST(
  _req: Request,
  ctx: { params: Record<string, string> },
): Response {
  const id = Number(ctx.params.id);
  deleteTodo(id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
    },
  });
}
