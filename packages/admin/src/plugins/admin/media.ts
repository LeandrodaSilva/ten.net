import { Route } from "@leproj/tennet";
import type { AdminContext } from "./context.ts";
import { requestSession } from "../../auth/authMiddleware.ts";

/** Regex de segurança: somente filenames seguros sem path traversal. */
const FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.[a-z]+$/;

/** HTML mínimo para a listagem de mídia no admin. */
function renderMediaList(
  items: Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    alt: string;
    createdAt: string;
  }>,
  search: string,
  csrfToken: string,
): string {
  const rows = items.map((item) =>
    `<tr>
      <td class="px-4 py-2"><img src="/media/${item.filename}" alt="${escAttr(item.alt || item.originalName)}" class="h-12 w-12 object-cover rounded" /></td>
      <td class="px-4 py-2 text-sm text-gray-800">${escHtml(item.originalName)}</td>
      <td class="px-4 py-2 text-sm text-gray-500">${escHtml(item.mimeType)}</td>
      <td class="px-4 py-2 text-sm text-gray-500">${(item.size / 1024).toFixed(1)} KB</td>
      <td class="px-4 py-2 text-sm text-gray-500">${escHtml(item.alt)}</td>
      <td class="px-4 py-2">
        <form method="POST" action="/admin/media/${escAttr(item.id)}/delete" onsubmit="return confirm('Excluir imagem?')">
          <input type="hidden" name="_csrf" value="${escAttr(csrfToken)}" />
          <button type="submit" class="text-red-600 hover:text-red-800 text-sm">Excluir</button>
        </form>
      </td>
    </tr>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Media Library — Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-6xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Media Library</h1>
      <a href="/admin" class="text-sm text-indigo-600 hover:text-indigo-800">← Admin</a>
    </div>

    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-700 mb-4">Upload de Imagem</h2>
      <form method="POST" action="/admin/media/upload" enctype="multipart/form-data" class="flex flex-col gap-3 max-w-md">
        <input type="hidden" name="_csrf" value="${escAttr(csrfToken)}" />
        <input type="file" name="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" required class="block w-full text-sm" />
        <input type="text" name="alt" placeholder="Texto alternativo (opcional)" class="border border-gray-300 rounded px-3 py-2 text-sm" />
        <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium">Enviar</button>
      </form>
    </div>

    <div class="bg-white rounded-lg shadow">
      <div class="p-4 border-b">
        <form method="GET" action="/admin/media" class="flex gap-2">
          <input type="text" name="search" value="${escAttr(search)}" placeholder="Buscar por nome ou alt..." class="border border-gray-300 rounded px-3 py-2 text-sm flex-1" />
          <button type="submit" class="bg-gray-100 border border-gray-300 rounded px-4 py-2 text-sm hover:bg-gray-200">Buscar</button>
        </form>
      </div>
      <table class="w-full">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tamanho</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alt</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${items.length === 0 ? '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Nenhuma imagem enviada ainda.</td></tr>' : rows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/** HTML mínimo para o picker de mídia (modo seleção, para embeds em formulários). */
function renderMediaPicker(
  items: Array<{
    id: string;
    filename: string;
    originalName: string;
    alt: string;
  }>,
  search: string,
  _csrfToken: string,
): string {
  const grid = items.map((item) =>
    `<button type="button" onclick="selectMedia('${escAttr(item.id)}','${escAttr(`/media/${item.filename}`)}','${escAttr(item.alt || item.originalName)}')"
       class="border-2 border-transparent hover:border-indigo-500 rounded p-1 focus:outline-none focus:border-indigo-500 cursor-pointer bg-white">
      <img src="/media/${item.filename}" alt="${escAttr(item.alt || item.originalName)}" class="h-24 w-24 object-cover rounded" />
      <p class="text-xs text-gray-600 mt-1 truncate w-24">${escHtml(item.originalName)}</p>
    </button>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Selecionar Mídia</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-4">
  <div class="mb-4 flex gap-2">
    <form method="GET" action="/admin/media/picker" class="flex gap-2 flex-1">
      <input type="text" name="search" value="${escAttr(search)}" placeholder="Buscar..." class="border border-gray-300 rounded px-3 py-2 text-sm flex-1" />
      <button type="submit" class="bg-gray-100 border border-gray-300 rounded px-4 py-2 text-sm">Buscar</button>
    </form>
  </div>
  <div class="flex flex-wrap gap-3">
    ${items.length === 0 ? '<p class="text-gray-400 text-sm">Nenhuma imagem disponível.</p>' : grid}
  </div>
  <script>
    function selectMedia(id, url, alt) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "media-selected", id, url, alt }, window.location.origin);
      }
    }
  </script>
</body>
</html>`;
}

function escHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Registra as rotas de admin da Media Library e a rota pública de serving.
 *
 *   GET  /admin/media              — lista com preview e form de upload
 *   POST /admin/media/upload       — upload multipart
 *   GET  /admin/media/picker       — picker para seleção em formulários
 *   POST /admin/media/:id/delete   — excluir item
 *   GET  /media/:filename          — serving PÚBLICO (sem auth)
 */
export function addMediaRoutes(ctx: AdminContext, routes: Route[]): void {
  if (!ctx.mediaStore) return;

  const store = ctx.mediaStore;

  // GET /admin/media — listagem
  const listRoute = new Route({
    path: "/admin/media",
    regex: /^\/admin\/media$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  listRoute.method = "GET";
  listRoute.run = async (req: Request) => {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const items = await store.list({ page, limit: 30, search: search || undefined });
    const csrfToken = requestSession.get(req)?.csrfToken ?? "";
    return new Response(renderMediaList(items, search, csrfToken), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  };
  routes.push(listRoute);

  // POST /admin/media/upload — upload multipart
  const uploadRoute = new Route({
    path: "/admin/media/upload",
    regex: /^\/admin\/media\/upload$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  uploadRoute.method = "POST";
  uploadRoute.run = async (req: Request) => {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return new Response("Bad Request: corpo multipart inválido", {
        status: 400,
      });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new Response("Bad Request: campo 'file' ausente ou inválido", {
        status: 400,
      });
    }

    const alt = String(formData.get("alt") ?? "");
    const uploadedBy = String(formData.get("uploadedBy") ?? "admin");

    let mediaItem;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      mediaItem = await store.upload(bytes, {
        originalName: file.name,
        mimeType: file.type,
        alt,
        uploadedBy,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar upload";
      return new Response(`Bad Request: ${msg}`, { status: 400 });
    }

    // Verificar se é requisição JSON (API) ou form browser
    const accept = req.headers.get("Accept") ?? "";
    if (accept.includes("application/json")) {
      return new Response(JSON.stringify(mediaItem), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/admin/media" },
    });
  };
  routes.push(uploadRoute);

  // GET /admin/media/picker — modo seleção
  const pickerRoute = new Route({
    path: "/admin/media/picker",
    regex: /^\/admin\/media\/picker$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  pickerRoute.method = "GET";
  pickerRoute.run = async (req: Request) => {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? "";
    const items = await store.list({ page: 1, limit: 100, search: search || undefined });
    const csrfToken = requestSession.get(req)?.csrfToken ?? "";
    return new Response(renderMediaPicker(items, search, csrfToken), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  };
  routes.push(pickerRoute);

  // POST /admin/media/:id/delete — excluir
  const deleteRoute = new Route({
    path: "/admin/media/[id]/delete",
    regex: /^\/admin\/media\/([^/]+)\/delete$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  deleteRoute.method = "POST";
  deleteRoute.run = async (
    req: Request,
    routeCtx?: { params: Record<string, string> },
  ) => {
    const id = routeCtx?.params?.id;
    if (!id) return new Response("Not Found", { status: 404 });

    await store.delete(id);

    const accept = req.headers.get("Accept") ?? "";
    if (accept.includes("application/json")) {
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/admin/media" },
    });
  };
  routes.push(deleteRoute);

  // GET /media/:filename — rota PÚBLICA de serving (sem auth)
  const serveRoute = new Route({
    path: "/media/[filename]",
    regex: /^\/media\/([^/]+)$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  serveRoute.method = "GET";
  serveRoute.run = async (
    _req: Request,
    routeCtx?: { params: Record<string, string> },
  ) => {
    const filename = routeCtx?.params?.filename;
    if (!filename || !FILENAME_REGEX.test(filename)) {
      return new Response("Not Found", { status: 404 });
    }

    // filename = `${uuid}.${ext}` → id é tudo antes do último ponto
    const lastDot = filename.lastIndexOf(".");
    if (lastDot < 1) return new Response("Not Found", { status: 404 });

    const id = filename.substring(0, lastDot);
    return await store.serve(id);
  };
  routes.push(serveRoute);
}
