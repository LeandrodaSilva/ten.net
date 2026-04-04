import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const todoRouteTs = `const items = [
  { id: 1, text: "Ler a documentacao do Ten.net", done: false },
  { id: 2, text: "Criar meu primeiro route.ts", done: true },
];

function renderItems(list) {
  if (list.length === 0) return "<li style='color:#94a3b8'>Nenhuma tarefa ainda.</li>";
  return list.map((item) =>
    '<li style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid #f1f5f9;">' +
      '<span style="font-size:1.1rem">' + (item.done ? "✅" : "⬜") + '</span>' +
      '<span style="' + (item.done ? "text-decoration:line-through;color:#94a3b8" : "") + '">' + item.text + '</span>' +
    '</li>'
  ).join("");
}

export function GET() {
  return Response.json({
    todo_list: renderItems(items),
    count: String(items.length),
    done_count: String(items.filter((i) => i.done).length),
  });
}

export async function POST(req) {
  const data = await req.formData().catch(() => null);
  const text = (data?.get("text") ?? "").toString().trim();
  if (text) {
    items.push({ id: Date.now(), text, done: false });
  }
  return new Response(null, {
    status: 302,
    headers: { Location: "./" },
  });
}`;

const todoPageHtml =
  `<div style="max-width:560px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
    <h1 style="font-size:1.5rem;font-weight:700;">TODO Offline</h1>
    <div style="display:flex;align-items:center;gap:.5rem;">
      <span id="badge" style="background:#22c55e;color:#fff;border-radius:999px;padding:.2rem .75rem;font-size:.75rem;font-weight:600;">Online</span>
      <button onclick="doSync()" style="background:#3178c6;color:#fff;border:none;border-radius:6px;padding:.35rem .9rem;cursor:pointer;font-size:.8rem;">Sync</button>
    </div>
  </div>

  <form method="POST" action="" style="display:flex;gap:.75rem;margin-bottom:1.5rem;">
    <input name="text" style="flex:1;padding:.5rem .75rem;border:1px solid #cbd5e1;border-radius:6px;" placeholder="Nova tarefa..." required />
    <button type="submit" style="background:#3178c6;color:#fff;border:none;border-radius:6px;padding:.5rem 1.25rem;cursor:pointer;font-weight:500;">Add</button>
  </form>

  <ul style="list-style:none;padding:0;margin-bottom:1rem;">
    {{{todo_list}}}
  </ul>

  <p style="color:#94a3b8;font-size:.8rem;">{{done_count}} de {{count}} concluidas</p>
</div>

<script>
  window.addEventListener("online", function() { document.getElementById("badge").textContent = "Online"; document.getElementById("badge").style.background = "#22c55e"; });
  window.addEventListener("offline", function() { document.getElementById("badge").textContent = "Offline"; document.getElementById("badge").style.background = "#f59e0b"; });
  if (!navigator.onLine) { document.getElementById("badge").textContent = "Offline"; document.getElementById("badge").style.background = "#f59e0b"; }
  function doSync() {
    fetch("api/sync").then(function(r) { return r.json(); }).then(function(d) {
      alert("Sync OK! " + d.items.length + " items no servidor.");
    }).catch(function() { alert("Sync falhou — offline?"); });
  }
</script>`;

const syncRouteTs = `export function GET() {
  return new Response(JSON.stringify({
    items: [],
    deleted: [],
    timestamp: Date.now(),
  }), {
    headers: { "Content-Type": "application/json" },
  });
}`;

const manifest: AppManifest = {
  routes: [
    {
      path: "/",
      regexSource: "^\\/$",
      regexFlags: "",
      hasPage: true,
      transpiledCode: todoRouteTs,
      pageContent: todoPageHtml,
    },
    {
      path: "/api/sync",
      regexSource: "^\\/api\\/sync$",
      regexFlags: "",
      hasPage: false,
      transpiledCode: syncRouteTs,
      pageContent: "",
    },
  ],
  layouts: {},
  documentHtml:
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>TODO Offline</title><style>*{box-sizing:border-box;margin:0;padding:0}</style></head><body>{{content}}</body></html>',
  assets: {},
};

export const todoOffline: Demo = {
  id: "todo-offline",
  title: "TODO Offline",
  description: "App TODO com sync endpoint e indicador online/offline",
  category: "offline",
  files: [
    {
      name: "route.ts",
      content: todoRouteTs,
      language: "typescript",
      editable: true,
    },
    {
      name: "page.html",
      content: todoPageHtml,
      language: "html",
      editable: true,
    },
  ],
  manifest,
  previewPath: "/",
};
