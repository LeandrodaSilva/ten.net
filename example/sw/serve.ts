const dir = new URL("./dist", import.meta.url).pathname;

Deno.serve({ port: 3000 }, async (req) => {
  const url = new URL(req.url);
  const path = url.pathname === "/" ? "/register.html" : url.pathname;
  try {
    const file = await Deno.readFile(`${dir}${path}`);
    const ct = path.endsWith(".js")
      ? "text/javascript"
      : path.endsWith(".html")
      ? "text/html"
      : "application/octet-stream";
    return new Response(file, { headers: { "Content-Type": ct } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
});
