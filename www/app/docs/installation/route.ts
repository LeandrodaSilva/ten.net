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
    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-2 mb-3">Requirements</h2>
    <p class="text-[#1a1c1e] leading-relaxed">Ten.net targets <strong>Deno 2.x</strong>. Make sure you have the latest version installed:</p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-4"><code class="language-bash">deno --version</code></pre>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Add the package</h2>
    <p class="text-[#1a1c1e] leading-relaxed">Add Ten.net to your project from JSR:</p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-4"><code class="language-bash">deno add jsr:@leproj/tennet</code></pre>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Hello world</h2>
    <p class="text-[#1a1c1e] leading-relaxed">Create a minimal app with two files:</p>
    <p class="text-sm text-[#5f6368] mt-4"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">main.ts</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-typescript">import { Ten } from "@leproj/tennet";

const app = Ten.net();
await app.start();</code></pre>

    <p class="text-sm text-[#5f6368] mt-4"><code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">app/page.html</code></p>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-2"><code class="language-html">&lt;h1&gt;Hello, Ten.net!&lt;/h1&gt;</code></pre>

    <h2 class="text-2xl font-semibold text-[#1a1c1e] mt-8 mb-3">Run it</h2>
    <pre class="bg-[#1b1b1f] text-[#e6edf3] rounded-xl p-4 overflow-auto font-mono-m3 text-sm mt-4"><code class="language-bash">deno run --allow-all --unstable-raw-imports main.ts</code></pre>
    <p class="text-[#1a1c1e] leading-relaxed mt-3">Visit <code class="bg-[#f5f7fa] text-[#3178c6] rounded px-1.5 py-0.5 font-mono-m3 text-sm">http://localhost:8000</code> and you should see your page.</p>
  `;
  return Response.json({
    navHtml: buildNavHtml("/docs/installation"),
    title: "Installation",
    bodyHtml,
  });
}
