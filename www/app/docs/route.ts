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
  `;
  return Response.json({
    navHtml: buildNavHtml("/docs"),
    title: "Introduction",
    bodyHtml,
  });
}

export { buildNavHtml };
