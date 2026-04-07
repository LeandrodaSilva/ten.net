import { assertStringIncludes } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";

Deno.test("TenCore propaga appPath para viewEngine — usa document.html customizado, não o fallback", async () => {
  // example/http/app/document.html contém o markup customizado do exemplo
  // (com tag @tailwindcss/browser e @tailwindplus/elements@1).
  // O defaultDocumentHtml NÃO contém @tailwindplus/elements.
  const core = new TenCore({ appPath: "./example/http/app" });

  // Adiciona uma rota mínima de view (page-only).
  const route = new Route({
    path: "/hello-apppath-test",
    regex: /^\/hello-apppath-test$/,
    hasPage: true,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.page = "<h1>Hello</h1>";
  core.addRoutes([route]);

  const res = await core.fetch(
    new Request("http://localhost/hello-apppath-test"),
  );
  const html = await res.text();

  // Confirma que o document.html customizado do example foi usado.
  assertStringIncludes(html, "@tailwindplus/elements");
  assertStringIncludes(html, "<h1>Hello</h1>");
});
