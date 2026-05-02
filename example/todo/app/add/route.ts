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

function addTodo(text: string) {
  const normalized = text.trim();
  if (!normalized) return;
  todoStore.todos.unshift({
    id: todoStore.nextId++,
    text: normalized,
    done: false,
  });
}

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const text = String(formData.get("text") ?? "").trim();
  addTodo(text);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
    },
  });
}
