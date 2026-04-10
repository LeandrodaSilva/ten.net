function buildNavHtml(currentPath: string, _locale?: string): string {
  const t = (key: string) => key;
  const links: Array<{ href: string; label: string }> = [
    { href: "/docs", label: t("Introduction") },
    { href: "/docs/installation", label: t("Installation") },
    { href: "/docs/routing", label: t("Routing") },
    { href: "/docs/templates", label: t("Templates") },
  ];
  const items = links.map((l) => {
    const active = l.href === currentPath;
    const cls = active
      ? "block rounded-xl px-3 py-2 text-sm bg-[#3178c6] text-white shadow-md3-btn font-medium"
      : "block rounded-xl px-3 py-2 text-sm text-[#1a1c1e] hover:bg-[#f5f7fa]";
    return `<a href="${l.href}" class="${cls}">${l.label}</a>`;
  }).join("");
  return `<div class="text-xs font-semibold uppercase tracking-widest text-[#5f6368] px-3 mb-2">${
    t("Getting Started")
  }</div><nav class="space-y-1">${items}</nav>`;
}

const bodyHtmlByLocale: Record<string, string> = {
  "en-US": `
    <p class="text-[#1a1c1e] leading-relaxed">
      Ten.net is a minimalist, extensible web microframework for TypeScript
      runtimes. It provides file-based routing, HTML templating, nested
      layouts, and a plugin system — without the configuration ceremony.
    </p>
    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Why Ten.net?</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><strong>Minimal core</strong> — only routing, templating, and plugin infrastructure.</li>
      <li><strong>Multi-runtime</strong> — runs on Deno today, with Node.js on the roadmap. Service Worker adapter included.</li>
      <li><strong>Extensible</strong> — official plugins for CMS, blog, media, and audit logging.</li>
      <li><strong>Self-contained binaries</strong> — compile your entire app into a single deployable file.</li>
      <li><strong>No ceremony</strong> — directories become routes, HTML files become templates.</li>
    </ul>
    <p class="text-[#1a1c1e] leading-relaxed mt-6">
      Ready to get started? Head over to
      <a href="/docs/installation" class="text-[#3178c6] hover:underline">Installation</a>
      to set up your first project.
    </p>
  `,
  "pt-BR": `
    <p class="text-[#1a1c1e] leading-relaxed">
      Ten.net é um microframework web minimalista e extensível para runtimes
      TypeScript. Oferece rotas baseadas em arquivos, templates HTML, layouts
      aninhados e sistema de plugins — sem cerimônia de configuração.
    </p>
    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Por que Ten.net?</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><strong>Core mínimo</strong> — apenas rotas, templates e infraestrutura de plugins.</li>
      <li><strong>Multi-runtime</strong> — roda em Deno hoje, com Node.js no roadmap. Adaptador de Service Worker incluído.</li>
      <li><strong>Extensível</strong> — plugins oficiais para CMS, blog, mídia e log de auditoria.</li>
      <li><strong>Binários autônomos</strong> — compile toda sua aplicação em um único arquivo.</li>
      <li><strong>Sem cerimônia</strong> — diretórios se tornam rotas, arquivos HTML se tornam templates.</li>
    </ul>
    <p class="text-[#1a1c1e] leading-relaxed mt-6">
      Pronto para começar? Vá para
      <a href="/docs/installation" class="text-[#3178c6] hover:underline">Instalação</a>
      para configurar seu primeiro projeto.
    </p>
  `,
  "es": `
    <p class="text-[#1a1c1e] leading-relaxed">
      Ten.net es un microframework web minimalista y extensible para runtimes
      TypeScript. Proporciona enrutamiento basado en archivos, plantillas HTML,
      layouts anidados y sistema de plugins — sin ceremonia de configuración.
    </p>
    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">¿Por qué Ten.net?</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><strong>Core mínimo</strong> — solo enrutamiento, plantillas e infraestructura de plugins.</li>
      <li><strong>Multi-runtime</strong> — corre en Deno hoy, con Node.js en el roadmap. Adaptador de Service Worker incluido.</li>
      <li><strong>Extensible</strong> — plugins oficiales para CMS, blog, media y logging de auditoría.</li>
      <li><strong>Binarios autónomos</strong> — compila toda tu aplicación en un único archivo.</li>
      <li><strong>Sin ceremonia</strong> — los directorios se convierten en rutas, los archivos HTML en plantillas.</li>
    </ul>
    <p class="text-[#1a1c1e] leading-relaxed mt-6">
      ¿Listo para empezar? Dirígete a
      <a href="/docs/installation" class="text-[#3178c6] hover:underline">Instalación</a>
      para configurar tu primer proyecto.
    </p>
  `,
};

const titleByLocale: Record<string, string> = {
  "en-US": "Introduction",
  "pt-BR": "Introdução",
  "es": "Introducción",
};

export function GET(
  _req: Request,
  ctx: { params: Record<string, string>; locale?: string },
): Response {
  const locale = ctx.locale ?? "en-US";
  const bodyHtml = bodyHtmlByLocale[locale] ?? bodyHtmlByLocale["en-US"];
  const title = titleByLocale[locale] ?? titleByLocale["en-US"];
  return Response.json({
    navHtml: buildNavHtml("/docs", locale),
    title,
    bodyHtml,
  });
}

export { buildNavHtml };
