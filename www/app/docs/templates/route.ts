function buildNavHtml(currentPath: string): string {
  const links: Array<{ href: string; label: string }> = [
    { href: "/docs", label: "Introduction" },
    { href: "/docs/installation", label: "Installation" },
    { href: "/docs/routing", label: "Routing" },
    { href: "/docs/templates", label: "Templates" },
  ];
  const items = links.map((l) => {
    const active = l.href === currentPath;
    const cls = active
      ? "block rounded-xl px-3 py-2 text-sm bg-[#3178c6] text-white shadow-md3-btn font-medium"
      : "block rounded-xl px-3 py-2 text-sm text-[#1a1c1e] hover:bg-[#f5f7fa]";
    return `<a href="${l.href}" class="${cls}">${l.label}</a>`;
  }).join("");
  return `<div class="text-xs font-semibold uppercase tracking-widest text-[#5f6368] px-3 mb-2">Getting Started</div><nav class="space-y-1">${items}</nav>`;
}

export function GET(_req: Request): Response {
  const bodyHtml = `
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
  `;
  return Response.json({
    navHtml: buildNavHtml("/docs/templates"),
    title: "Templates",
    bodyHtml,
  });
}
