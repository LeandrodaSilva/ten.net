interface BenchEntry {
  results: Record<
    string,
    { avg: number; p75: number; p99: number; n: number }
  >;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMs(value: number): string {
  return `${value.toFixed(3)}ms`;
}

const FEATURES: Array<{ icon: string; title: string; desc: string }> = [
  {
    icon: "bolt",
    title: "File-based routing",
    desc: "Directory layout maps to URL routes. No config, no decorators.",
  },
  {
    icon: "description",
    title: "HTML templating",
    desc:
      "Mustache placeholders {{var}} and triple-brace {{{raw}}} for safe rendering.",
  },
  {
    icon: "layers",
    title: "Nested layouts",
    desc: "Layouts compose hierarchically from root to leaf via {{content}}.",
  },
  {
    icon: "extension",
    title: "Plugin system",
    desc:
      "Extend with the abstract Plugin class. CMS, blog, media, audit packages available.",
  },
  {
    icon: "language",
    title: "Multi-runtime",
    desc: "Run on Deno today, Service Workers in browsers, Node.js coming.",
  },
  {
    icon: "package_2",
    title: "Self-contained binaries",
    desc: "Compile your entire app into a single AES-256-GCM encrypted binary.",
  },
];

function renderFeatures(): string {
  return FEATURES.map((f) =>
    `<div class="bg-white rounded-2xl shadow-md3-1 p-6">` +
    `<span class="material-symbols-outlined text-[#3178c6]" style="font-size:28px">${f.icon}</span>` +
    `<h3 class="mt-3 text-[#1a1c1e] font-semibold">${
      escapeHtml(f.title)
    }</h3>` +
    `<p class="mt-2 text-sm text-[#5f6368]">${escapeHtml(f.desc)}</p>` +
    `</div>`
  ).join("");
}

const ROUTE_TS_SOURCE = `// app/hello/route.ts
export function GET() {
  return Response.json({ name: "World" });
}`;

const PAGE_HTML_SOURCE = `<!-- app/hello/page.html -->
<h1>Hello {{name}}!</h1>`;

export async function GET(_req: Request): Promise<Response> {
  const denoJson = JSON.parse(
    await Deno.readTextFile("./deno.json"),
  ) as { version: string };
  const version = denoJson.version;

  const history = JSON.parse(
    await Deno.readTextFile("./benchmarks/history.json"),
  ) as BenchEntry[];
  const last = history[history.length - 1];
  const viewP75 = formatMs(last.results.viewEngine_static.p75);
  const routerAvg = formatMs(last.results.routerEngine_full.avg);

  return Response.json({
    version,
    installCmd: `deno add jsr:@leproj/tennet@^${version}`,
    viewP75,
    routerAvg,
    featuresHtml: renderFeatures(),
    codeRouteTs: escapeHtml(ROUTE_TS_SOURCE),
    codePageHtml: escapeHtml(PAGE_HTML_SOURCE),
  });
}
