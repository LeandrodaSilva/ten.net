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

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

const FEATURES_BY_LOCALE: Record<string, Feature[]> = {
  "en-US": [
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
      desc:
        "Compile your entire app into a single AES-256-GCM encrypted binary.",
    },
  ],
  "pt-BR": [
    {
      icon: "bolt",
      title: "Rotas baseadas em arquivos",
      desc:
        "A estrutura de diretórios mapeia para rotas URL. Sem configuração, sem decorators.",
    },
    {
      icon: "description",
      title: "Templates HTML",
      desc:
        "Placeholders mustache {{var}} e triple-brace {{{raw}}} para renderização segura.",
    },
    {
      icon: "layers",
      title: "Layouts aninhados",
      desc:
        "Layouts se compõem hierarquicamente da raiz à folha via {{content}}.",
    },
    {
      icon: "extension",
      title: "Sistema de plugins",
      desc:
        "Estenda com a classe abstrata Plugin. Pacotes de CMS, blog, mídia e auditoria disponíveis.",
    },
    {
      icon: "language",
      title: "Multi-runtime",
      desc:
        "Rode em Deno hoje, Service Workers no navegador, Node.js em breve.",
    },
    {
      icon: "package_2",
      title: "Binários autônomos",
      desc:
        "Compile toda sua aplicação em um único binário criptografado com AES-256-GCM.",
    },
  ],
  "es": [
    {
      icon: "bolt",
      title: "Enrutamiento basado en archivos",
      desc:
        "La estructura de directorios se mapea a rutas URL. Sin configuración, sin decoradores.",
    },
    {
      icon: "description",
      title: "Plantillas HTML",
      desc:
        "Placeholders mustache {{var}} y triple-brace {{{raw}}} para renderización segura.",
    },
    {
      icon: "layers",
      title: "Layouts anidados",
      desc:
        "Los layouts se componen jerárquicamente de raíz a hoja via {{content}}.",
    },
    {
      icon: "extension",
      title: "Sistema de plugins",
      desc:
        "Extiende con la clase abstracta Plugin. Paquetes de CMS, blog, media y auditoría disponibles.",
    },
    {
      icon: "language",
      title: "Multi-runtime",
      desc:
        "Corre en Deno hoy, Service Workers en navegadores, Node.js próximamente.",
    },
    {
      icon: "package_2",
      title: "Binarios autónomos",
      desc:
        "Compila toda tu aplicación en un único binario encriptado con AES-256-GCM.",
    },
  ],
};

function renderFeatures(locale: string): string {
  const features = FEATURES_BY_LOCALE[locale] ?? FEATURES_BY_LOCALE["en-US"];
  return features.map((f) =>
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

export async function GET(
  _req: Request,
  ctx: { params: Record<string, string>; locale?: string },
): Promise<Response> {
  const locale = ctx.locale ?? "en-US";
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
    featuresHtml: renderFeatures(locale),
    codeRouteTs: escapeHtml(ROUTE_TS_SOURCE),
    codePageHtml: escapeHtml(PAGE_HTML_SOURCE),
  });
}
