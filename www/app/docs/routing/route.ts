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
      The <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/</code> directory maps directly to URL routes. No router
      configuration, no decorators — directories become URLs.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Conventions</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">route.ts</code> — exports HTTP method handlers (<code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">GET</code>, <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">POST</code>, etc).</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">page.html</code> — HTML template with <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{variable}}</code> placeholders.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">layout.html</code> — wrapping layout that nests via <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code>.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">document.html</code> — root HTML wrapper (only at the app root).</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">[param]/</code> — dynamic route segments captured in <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">params</code>.</li>
    </ul>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Example handler</h2>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm"><code class="language-typescript">// app/users/[id]/route.ts
export function GET(_req: Request, ctx: { params: { id: string } }) {
  return Response.json({ id: ctx.params.id });
}</code></pre>

    <p class="text-[#1a1c1e] leading-relaxed mt-4">
      The fields returned from <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">Response.json()</code> populate the
      <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{key}}</code> placeholders in the matching <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">page.html</code>.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Layout nesting</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      Layouts compose from the root down to the leaf route. Each layer wraps
      the next via <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code>, so <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/layout.html</code>
      wraps <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/docs/layout.html</code> wraps <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/docs/page.html</code>.
    </p>
  `,
  "pt-BR": `
    <p class="text-[#1a1c1e] leading-relaxed">
      O diretório <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/</code> mapeia diretamente para rotas de URL. Sem
      configuração de router, sem decorators — diretórios viram URLs.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Convenções</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">route.ts</code> — exporta handlers de métodos HTTP (<code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">GET</code>, <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">POST</code>, etc).</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">page.html</code> — template HTML com placeholders <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{variável}}</code>.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">layout.html</code> — layout wrapper que aninha via <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code>.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">document.html</code> — wrapper HTML raiz (apenas na raiz do app).</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">[param]/</code> — segmentos de rota dinâmicos capturados em <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">params</code>.</li>
    </ul>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Exemplo de handler</h2>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm"><code class="language-typescript">// app/users/[id]/route.ts
export function GET(_req: Request, ctx: { params: { id: string } }) {
  return Response.json({ id: ctx.params.id });
}</code></pre>

    <p class="text-[#1a1c1e] leading-relaxed mt-4">
      Os campos retornados de <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">Response.json()</code> populam os
      placeholders <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{key}}</code> no <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">page.html</code> correspondente.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Aninhamento de layouts</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      Layouts se compõem da raiz até a rota folha. Cada camada envolve
      a próxima via <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code>, então <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/layout.html</code>
      envolve <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/docs/layout.html</code> que envolve <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/docs/page.html</code>.
    </p>
  `,
  "es": `
    <p class="text-[#1a1c1e] leading-relaxed">
      El directorio <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/</code> se mapea directamente a rutas URL. Sin
      configuración de router, sin decoradores — los directorios se convierten en URLs.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Convenciones</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">route.ts</code> — exporta handlers de métodos HTTP (<code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">GET</code>, <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">POST</code>, etc).</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">page.html</code> — plantilla HTML con placeholders <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{variable}}</code>.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">layout.html</code> — layout envolvente que anida via <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code>.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">document.html</code> — wrapper HTML raíz (solo en la raíz del app).</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">[param]/</code> — segmentos de ruta dinámicos capturados en <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">params</code>.</li>
    </ul>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Ejemplo de handler</h2>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm"><code class="language-typescript">// app/users/[id]/route.ts
export function GET(_req: Request, ctx: { params: { id: string } }) {
  return Response.json({ id: ctx.params.id });
}</code></pre>

    <p class="text-[#1a1c1e] leading-relaxed mt-4">
      Los campos retornados de <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">Response.json()</code> populan los
      placeholders <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{key}}</code> en el <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">page.html</code> correspondiente.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Anidamiento de layouts</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      Los layouts se componen desde la raíz hasta la ruta hoja. Cada capa envuelve
      la siguiente via <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code>, entonces <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/layout.html</code>
      envuelve <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/docs/layout.html</code> que envuelve <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/docs/page.html</code>.
    </p>
  `,
};

const titleByLocale: Record<string, string> = {
  "en-US": "Routing",
  "pt-BR": "Rotas",
  "es": "Enrutamiento",
};

export function GET(
  _req: Request,
  ctx: { params: Record<string, string>; locale?: string },
): Response {
  const locale = ctx.locale ?? "en-US";
  const bodyHtml = bodyHtmlByLocale[locale] ?? bodyHtmlByLocale["en-US"];
  const title = titleByLocale[locale] ?? titleByLocale["en-US"];
  return Response.json({
    navHtml: buildNavHtml("/docs/routing", locale),
    title,
    bodyHtml,
  });
}
