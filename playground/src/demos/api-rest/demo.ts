import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `const items = [
  { id: 1, name: "Item A" },
  { id: 2, name: "Item B" },
];

export function GET() {
  return new Response(JSON.stringify({ items }), {
    headers: { "Content-Type": "application/json" },
  });
}

export function POST(ctx) {
  const body = ctx.body ?? {};
  const newItem = { id: items.length + 1, name: body.name ?? "New Item" };
  items.push(newItem);
  return new Response(JSON.stringify({ created: newItem }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

export function PUT(ctx) {
  const body = ctx.body ?? {};
  const item = items.find((i) => i.id === body.id);
  if (!item) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  item.name = body.name ?? item.name;
  return new Response(JSON.stringify({ updated: item }), {
    headers: { "Content-Type": "application/json" },
  });
}

export function DELETE(ctx) {
  const body = ctx.body ?? {};
  const idx = items.findIndex((i) => i.id === body.id);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const [removed] = items.splice(idx, 1);
  return new Response(JSON.stringify({ deleted: removed }), {
    headers: { "Content-Type": "application/json" },
  });
}`;

const manifest: AppManifest = {
  routes: [{
    path: "/api/items",
    regexSource: "^\\/api\\/items$",
    regexFlags: "",
    hasPage: false,
    transpiledCode: routeTs,
    pageContent: "",
  }],
  layouts: {},
  documentHtml: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>API</title></head><body>{{content}}</body></html>',
  assets: {},
};

export const apiRest: Demo = {
  id: "api-rest",
  title: "API REST",
  description: "Endpoints GET/POST/PUT/DELETE retornando JSON",
  category: "routing",
  files: [
    { name: "route.ts", content: routeTs, language: "typescript", editable: true },
  ],
  manifest,
  previewPath: "/api/items",
};
