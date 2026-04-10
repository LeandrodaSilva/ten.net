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
      Ten.net templates are plain HTML files with mustache-style placeholders.
      The keys returned from your route handler are substituted into the
      template before it is sent to the client.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Escaped vs raw output</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{key}}</code> — HTML-escaped (XSS-safe). Use this for user data and most strings.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{{key}}}</code> — raw HTML output. Use this only when the value is trusted markup.</li>
    </ul>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Example</h2>
    <p class="text-sm text-[#5f6368] mt-3"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/hello/route.ts</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-typescript">export function GET() {
  return Response.json({
    name: "&lt;World&gt;",
    badgeHtml: "&lt;span class='badge'&gt;new&lt;/span&gt;",
  });
}</code></pre>

    <p class="text-sm text-[#5f6368] mt-4"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/hello/page.html</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-html">&lt;h1&gt;Hello {{name}}!&lt;/h1&gt;
&lt;div&gt;{{{badgeHtml}}}&lt;/div&gt;</code></pre>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Nested layouts</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      A <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">layout.html</code> file wraps every page in its directory and all
      child directories. The placeholder <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code> is replaced
      with the rendered child content. Layouts compose from the root down,
      so the deepest layout is closest to the page.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">No loops</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      The template engine intentionally has no loop or conditional syntax.
      Pre-render lists in your handler as an HTML string and expose it via
      <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{{listHtml}}}</code>. This keeps templates static and easy to
      reason about.
    </p>
  `,
  "pt-BR": `
    <p class="text-[#1a1c1e] leading-relaxed">
      Templates Ten.net são arquivos HTML simples com placeholders estilo mustache.
      As chaves retornadas do handler da rota são substituídas no template
      antes de ser enviado ao cliente.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Saída escapada vs bruta</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{key}}</code> — HTML escapado (XSS-safe). Use para dados do usuário e a maioria das strings.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{{key}}}</code> — saída HTML bruta. Use apenas quando o valor é markup confiável.</li>
    </ul>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Exemplo</h2>
    <p class="text-sm text-[#5f6368] mt-3"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/hello/route.ts</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-typescript">export function GET() {
  return Response.json({
    name: "&lt;World&gt;",
    badgeHtml: "&lt;span class='badge'&gt;new&lt;/span&gt;",
  });
}</code></pre>

    <p class="text-sm text-[#5f6368] mt-4"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/hello/page.html</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-html">&lt;h1&gt;Hello {{name}}!&lt;/h1&gt;
&lt;div&gt;{{{badgeHtml}}}&lt;/div&gt;</code></pre>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Layouts aninhados</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      Um arquivo <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">layout.html</code> envolve toda página no seu diretório e
      todos os diretórios filhos. O placeholder <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code> é substituído
      pelo conteúdo filho renderizado. Layouts se compõem da raiz para baixo,
      então o layout mais profundo fica mais próximo da página.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Sem loops</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      O template engine intencionalmente não tem sintaxe de loop ou condicional.
      Pré-renderize listas no handler como string HTML e exponha via
      <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{{listHtml}}}</code>. Isso mantém os templates estáticos e fáceis de
      entender.
    </p>
  `,
  "es": `
    <p class="text-[#1a1c1e] leading-relaxed">
      Las plantillas Ten.net son archivos HTML simples con placeholders estilo mustache.
      Las claves retornadas del handler de la ruta se sustituyen en la plantilla
      antes de ser enviada al cliente.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Salida escapada vs cruda</h2>
    <ul class="list-disc list-inside space-y-1 text-[#1a1c1e]">
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{key}}</code> — HTML escapado (XSS-safe). Úsalo para datos del usuario y la mayoría de strings.</li>
      <li><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{{key}}}</code> — salida HTML cruda. Úsalo solo cuando el valor es markup de confianza.</li>
    </ul>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Ejemplo</h2>
    <p class="text-sm text-[#5f6368] mt-3"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/hello/route.ts</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-typescript">export function GET() {
  return Response.json({
    name: "&lt;World&gt;",
    badgeHtml: "&lt;span class='badge'&gt;new&lt;/span&gt;",
  });
}</code></pre>

    <p class="text-sm text-[#5f6368] mt-4"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/hello/page.html</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-html">&lt;h1&gt;Hello {{name}}!&lt;/h1&gt;
&lt;div&gt;{{{badgeHtml}}}&lt;/div&gt;</code></pre>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Layouts anidados</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      Un archivo <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">layout.html</code> envuelve toda página en su directorio y
      todos los directorios hijos. El placeholder <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{content}}</code> se reemplaza
      con el contenido hijo renderizado. Los layouts se componen desde la raíz,
      así que el layout más profundo está más cerca de la página.
    </p>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Sin loops</h2>
    <p class="text-[#1a1c1e] leading-relaxed">
      El motor de plantillas intencionalmente no tiene sintaxis de loops o condicionales.
      Pre-renderiza listas en tu handler como string HTML y expónlo via
      <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">{{{listHtml}}}</code>. Esto mantiene las plantillas estáticas y fáciles de
      entender.
    </p>
  `,
};

const titleByLocale: Record<string, string> = {
  "en-US": "Templates",
  "pt-BR": "Templates",
  "es": "Plantillas",
};

export function GET(
  _req: Request,
  ctx: { params: Record<string, string>; locale?: string },
): Response {
  const locale = ctx.locale ?? "en-US";
  const bodyHtml = bodyHtmlByLocale[locale] ?? bodyHtmlByLocale["en-US"];
  const title = titleByLocale[locale] ?? titleByLocale["en-US"];
  return Response.json({
    navHtml: buildNavHtml("/docs/templates", locale),
    title,
    bodyHtml,
  });
}
