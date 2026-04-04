import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET() {
  return {
    title: "Nested Layouts",
    body: "O conteudo desta pagina e envolvido por dois layouts aninhados.",
  };
}`;

const pageHtml = `<div style="padding:1.5rem;">
  <h1>{{title}}</h1>
  <p>{{body}}</p>
</div>`;

const rootLayout =
  `<nav style="background:#3178c6;color:#fff;padding:.75rem 1.5rem;display:flex;align-items:center;gap:1rem;">
  <strong>Ten.net</strong>
  <a href="/" style="color:#fff;text-decoration:none;font-size:.875rem;">Home</a>
  <a href="/section/page" style="color:#fff;text-decoration:none;font-size:.875rem;">Section</a>
</nav>
<div>
  {{content}}
</div>`;

const sectionLayout = `<div style="display:flex;">
  <aside style="width:200px;border-right:4px solid #3178c6;padding:1rem;background:#f0f7ff;">
    <p style="font-size:.875rem;color:#3178c6;font-weight:600;">Section</p>
  </aside>
  <div style="flex:1;">
    {{content}}
  </div>
</div>`;

const manifest: AppManifest = {
  routes: [{
    path: "/section/page",
    regexSource: "^\\/section\\/page$",
    regexFlags: "",
    hasPage: true,
    transpiledCode: routeTs,
    pageContent: pageHtml,
  }],
  layouts: {
    "/": [rootLayout],
    "/section": [rootLayout, sectionLayout],
  },
  documentHtml:
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{title}}</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}</style></head><body>{{content}}</body></html>',
  assets: {},
};

export const nestedLayouts: Demo = {
  id: "nested-layouts",
  title: "Nested Layouts",
  description: "Layouts aninhados do root ate a secao interna",
  category: "templates",
  files: [
    {
      name: "route.ts",
      content: routeTs,
      language: "typescript",
      editable: false,
    },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
    {
      name: "layout.html",
      content: sectionLayout,
      language: "html",
      editable: true,
    },
  ],
  manifest,
  previewPath: "/section/page",
};
