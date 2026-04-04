import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET() {
  return {
    title: "Hello Ten.net",
    message: "Welcome to the playground!",
  };
}`;

const pageHtml = `<h1>{{title}}</h1>
<p>{{message}}</p>`;

const manifest: AppManifest = {
  routes: [{
    path: "/",
    regexSource: "^\\/$",
    regexFlags: "",
    hasPage: true,
    transpiledCode: routeTs,
    pageContent: pageHtml,
  }],
  layouts: {},
  documentHtml: "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>{{title}}</title></head><body>{{content}}</body></html>",
  assets: {},
};

export const helloWorld: Demo = {
  id: "hello-world",
  title: "Hello World",
  description: "Rota basica com GET handler",
  category: "routing",
  files: [
    { name: "route.ts", content: routeTs, language: "typescript", editable: true },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
  ],
  manifest,
  previewPath: "/",
};
