import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET() {
  return Response.json({
    title: "Page + Layout",
    content: "Este conteudo vem do handler e e injetado na pagina.",
    year: new Date().getFullYear(),
  });
}`;

const pageHtml =
  `<article style="padding:1.5rem;max-width:720px;margin:0 auto;">
  <h1>{{title}}</h1>
  <p>{{content}}</p>
</article>`;

const layoutHtml =
  `<header style="background:#3178c6;color:#fff;padding:1rem 1.5rem;">
  <strong>Ten.net</strong>
</header>
<main>
  {{content}}
</main>
<footer style="padding:1rem 1.5rem;color:#666;font-size:.875rem;border-top:1px solid #e2e8f0;">
  &copy; {{year}} Ten.net
</footer>`;

const manifest: AppManifest = {
  routes: [{
    path: "/",
    regexSource: "^\\/$",
    regexFlags: "",
    hasPage: true,
    transpiledCode: routeTs,
    pageContent: pageHtml,
  }],
  layouts: { "/": [layoutHtml] },
  documentHtml:
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{title}}</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}</style></head><body>{{content}}</body></html>',
  assets: {},
};

export const pageLayout: Demo = {
  id: "page-layout",
  title: "Page + Layout",
  description: "Template com layout envolvendo o conteudo da pagina",
  category: "templates",
  files: [
    {
      name: "route.ts",
      content: routeTs,
      language: "typescript",
      editable: true,
    },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
    {
      name: "layout.html",
      content: layoutHtml,
      language: "html",
      editable: true,
    },
  ],
  manifest,
  previewPath: "/",
};
