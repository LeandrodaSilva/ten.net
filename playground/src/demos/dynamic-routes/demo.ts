import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET(ctx) {
  const name = ctx.params.name ?? "stranger";
  return {
    title: "Dynamic Route",
    greeting: \`Hello, \${name}!\`,
  };
}`;

const pageHtml = `<h1>{{title}}</h1>
<p>{{greeting}}</p>`;

const manifest: AppManifest = {
  routes: [{
    path: "/hello/[name]",
    regexSource: "^\\/hello\\/([^\\/]+)$",
    regexFlags: "",
    hasPage: true,
    transpiledCode: routeTs,
    pageContent: pageHtml,
  }],
  layouts: {},
  documentHtml: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{title}}</title></head><body>{{content}}</body></html>',
  assets: {},
};

export const dynamicRoutes: Demo = {
  id: "dynamic-routes",
  title: "Dynamic Routes",
  description: "Parametros de URL com [param] na rota",
  category: "routing",
  files: [
    { name: "route.ts", content: routeTs, language: "typescript", editable: true },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
  ],
  manifest,
  previewPath: "/hello/world",
};
