const port = 3000;

Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);
  let path = url.pathname;
  if (path === "/") path = "/index.html";

  const mimeTypes: Record<string, string> = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
  };

  try {
    const file = await Deno.readFile("playground/dist" + path);
    const ext = path.split(".").pop() || "";
    return new Response(file, {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // SPA fallback
    try {
      const index = await Deno.readFile("playground/dist/index.html");
      return new Response(index, { headers: { "Content-Type": "text/html" } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
});

console.log("Playground dev server: http://localhost:" + port);
