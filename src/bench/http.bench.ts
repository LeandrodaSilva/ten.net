import { startServer, stopServer } from "./_helpers.ts";
import type { ServerContext } from "./_helpers.ts";

// Start server before benchmarks run
const ctx: ServerContext = await startServer();
const base = ctx.baseUrl;

Deno.bench("http_static_page", async () => {
  const res = await fetch(`${base}/`);
  await res.body?.cancel();
});

Deno.bench("http_view_template", async () => {
  const res = await fetch(`${base}/hello`);
  await res.body?.cancel();
});

Deno.bench("http_api", async () => {
  const res = await fetch(`${base}/api/hello`);
  await res.body?.cancel();
});

Deno.bench("http_dynamic_param", async () => {
  const res = await fetch(`${base}/api/hello/BenchUser`);
  await res.body?.cancel();
});

Deno.bench("http_admin", async () => {
  const res = await fetch(`${base}/admin`);
  await res.body?.cancel();
});

Deno.bench("http_404", async () => {
  const res = await fetch(`${base}/nonexistent`);
  await res.body?.cancel();
});

Deno.bench("http_post_redirect", async () => {
  const res = await fetch(`${base}/form`, {
    method: "POST",
    body: new URLSearchParams({ name: "BenchUser" }),
    redirect: "manual",
  });
  await res.body?.cancel();
});

globalThis.addEventListener("unload", async () => {
  await stopServer(ctx);
});
