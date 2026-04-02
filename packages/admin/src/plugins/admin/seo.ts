import { Route } from "@leproj/tennet";
import type { AdminContext } from "./context.ts";
import { escapeAttrValue } from "./utils.ts";

/**
 * Add SEO routes: GET /sitemap.xml and GET /robots.txt.
 * Both routes are public (no auth required).
 */
export function addSeoRoutes(
  ctx: AdminContext,
  routes: Route[],
): void {
  // GET /sitemap.xml — XML sitemap for search engines
  const sitemapRoute = new Route({
    path: "/sitemap.xml",
    regex: /^\/sitemap\.xml$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  sitemapRoute.method = "GET";
  sitemapRoute.run = (req: Request) => {
    const url = new URL(req.url);
    const siteUrl = `${url.protocol}//${url.host}`;

    const entries: string[] = [];

    // Homepage
    entries.push(
      `  <url>\n    <loc>${escapeAttrValue(siteUrl)}/</loc>\n  </url>`,
    );

    // Published dynamic pages
    const pages = ctx.dynamicRegistry?.all() ?? [];
    for (const page of pages) {
      entries.push(
        `  <url>\n    <loc>${
          escapeAttrValue(`${siteUrl}/${page.slug}`)
        }</loc>\n  </url>`,
      );
    }

    // Published blog posts (paginate through all)
    if (ctx.blogRegistry) {
      let page = 1;
      while (true) {
        const { posts, totalPages } = ctx.blogRegistry.listPublished({
          page,
          limit: 50,
        });
        for (const post of posts) {
          const lastmod = post.published_at
            ? `\n    <lastmod>${
              escapeAttrValue(post.published_at.slice(0, 10))
            }</lastmod>`
            : "";
          entries.push(
            `  <url>\n    <loc>${
              escapeAttrValue(`${siteUrl}/blog/${post.slug}`)
            }</loc>${lastmod}\n  </url>`,
          );
        }
        if (page >= totalPages) break;
        page++;
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  };
  routes.push(sitemapRoute);

  // GET /robots.txt — crawler directives
  const robotsRoute = new Route({
    path: "/robots.txt",
    regex: /^\/robots\.txt$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  robotsRoute.method = "GET";
  robotsRoute.run = (req: Request) => {
    const url = new URL(req.url);
    const siteUrl = `${url.protocol}//${url.host}`;

    const body = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${siteUrl}/sitemap.xml
`;

    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  };
  routes.push(robotsRoute);
}
