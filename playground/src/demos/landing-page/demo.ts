import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET() {
  return Response.json({
    hero_title: "Build fast with Ten.net",
    hero_subtitle: "Minimalist TypeScript web framework — file-based routing, HTML templates, zero config.",
    feature1_icon: "⚡",
    feature1_title: "File-based Routing",
    feature1_desc: "Drop a route.ts in any directory and the route is live instantly.",
    feature2_icon: "🧩",
    feature2_title: "Plugin System",
    feature2_desc: "Extend the core with typed plugins. CMS, blog, media — all optional.",
    feature3_icon: "📦",
    feature3_title: "Single Binary",
    feature3_desc: "Compile your entire app into one encrypted self-contained binary.",
    price: "Free & Open Source",
    price_note: "Published to JSR. MIT license.",
  });
}`;

const pageHtml = `<!-- Hero -->
<section style="background:#3178c6;color:#fff;padding:5rem 1.5rem;text-align:center;">
  <h1 style="font-size:2.5rem;font-weight:700;margin-bottom:1rem;">{{hero_title}}</h1>
  <p style="font-size:1.2rem;opacity:.9;max-width:600px;margin:0 auto 2rem;">{{hero_subtitle}}</p>
  <a href="#features" style="background:#fff;color:#3178c6;padding:.75rem 2rem;border-radius:6px;font-weight:600;text-decoration:none;display:inline-block;">Ver recursos</a>
</section>

<!-- Features -->
<section id="features" style="padding:4rem 1.5rem;max-width:900px;margin:0 auto;">
  <h2 style="text-align:center;margin-bottom:2.5rem;font-size:1.75rem;">Por que Ten.net?</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;">
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;">
      <div style="font-size:2rem;margin-bottom:.75rem;">{{feature1_icon}}</div>
      <h3 style="margin-bottom:.5rem;">{{feature1_title}}</h3>
      <p style="color:#64748b;font-size:.9rem;">{{feature1_desc}}</p>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;">
      <div style="font-size:2rem;margin-bottom:.75rem;">{{feature2_icon}}</div>
      <h3 style="margin-bottom:.5rem;">{{feature2_title}}</h3>
      <p style="color:#64748b;font-size:.9rem;">{{feature2_desc}}</p>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem;">
      <div style="font-size:2rem;margin-bottom:.75rem;">{{feature3_icon}}</div>
      <h3 style="margin-bottom:.5rem;">{{feature3_title}}</h3>
      <p style="color:#64748b;font-size:.9rem;">{{feature3_desc}}</p>
    </div>
  </div>
</section>

<!-- Pricing -->
<section style="background:#f8fafc;padding:3rem 1.5rem;text-align:center;">
  <h2 style="font-size:1.5rem;margin-bottom:.75rem;">{{price}}</h2>
  <p style="color:#64748b;">{{price_note}}</p>
</section>`;

const layoutHtml =
  `<nav style="background:#1e3a5f;color:#fff;padding:.75rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
  <strong style="font-size:1.1rem;">Ten.net</strong>
  <div style="display:flex;gap:1.5rem;">
    <a href="#features" style="color:#93c5fd;text-decoration:none;font-size:.875rem;">Recursos</a>
    <a href="https://jsr.io/@leproj/tennet" style="color:#93c5fd;text-decoration:none;font-size:.875rem;">JSR</a>
  </div>
</nav>
{{content}}
<footer style="background:#1e3a5f;color:#93c5fd;padding:1.25rem 1.5rem;text-align:center;font-size:.8rem;">
  &copy; 2025 Ten.net &mdash; MIT License
</footer>`;

const manifest: AppManifest = {
  routes: [{
    path: "/",
    regexSource: "^\\/$",
    regexFlags: "",
    hasPage: true,
    transpiledCode: routeTs,
    pageContent: pageHtml,
  }],
  layouts: { "/": [layoutHtml] },
  documentHtml:
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ten.net</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}</style></head><body>{{content}}</body></html>',
  assets: {},
};

export const landingPage: Demo = {
  id: "landing-page",
  title: "Landing Page",
  description: "Landing page promocional com hero, features e pricing",
  category: "showcase",
  files: [
    {
      name: "route.ts",
      content: routeTs,
      language: "typescript",
      editable: true,
    },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
    {
      name: "layout.html",
      content: layoutHtml,
      language: "html",
      editable: true,
    },
  ],
  manifest,
  previewPath: "/",
};
