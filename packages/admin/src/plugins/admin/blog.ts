import { Route } from "@leproj/tennet";
import { renderDynamicPage } from "@leproj/tennet";
import { CategoriesPlugin } from "../categoriesPlugin.ts";
import type { AdminContext } from "./context.ts";
import {
  escapeAttrValue,
  escapeHtml,
  injectHeadTags,
  RSS_DISCOVERY_TAG,
  sanitizeHtml,
} from "./utils.ts";

/** Render a friendly 404 page for public blog routes. */
async function blog404(appPath: string, title: string): Promise<Response> {
  const bodyHtml = `<div class="max-w-3xl mx-auto text-center py-16">
  <h1 class="text-4xl font-bold text-gray-900 mb-4">${escapeHtml(title)}</h1>
  <p class="text-gray-500 mb-8">The page you are looking for does not exist or has been removed.</p>
  <a href="/blog" class="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Back to Blog</a>
</div>`;
  const html = await renderDynamicPage(
    {
      id: "blog-404",
      body: bodyHtml,
      title,
      seo_title: title,
      seo_description: "Page not found",
      template: "blog-404",
    },
    appPath,
  );
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html" },
  });
}

/** Generate public blog routes (GET /blog and GET /blog/{slug}). */
export function addBlogRoutes(ctx: AdminContext, routes: Route[]): void {
  if (!ctx.blogRegistry) return;
  const registry = ctx.blogRegistry;
  const appPath = ctx.appPath;

  // GET /blog — paginated listing
  const blogListRoute = new Route({
    path: "/blog",
    regex: /^\/blog$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  blogListRoute.method = "GET";
  blogListRoute.run = async (req: Request) => {
    const url = new URL(req.url);
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
    );
    const { posts, total, totalPages } = registry.listPublished({
      page,
      limit: 10,
    });

    const postItems = await Promise.all(
      posts.map(async (post) => {
        const categories = await registry.getCategories(post.category_ids);
        return `<article class="mb-8 pb-8 border-b border-gray-200">
  <h2><a href="/blog/${
          escapeAttrValue(post.slug)
        }" class="text-xl font-semibold text-indigo-600 hover:text-indigo-800">${
          escapeHtml(post.title)
        }</a></h2>
  ${
          post.cover_image
            ? `<img src="${escapeAttrValue(post.cover_image)}" alt="${
              escapeAttrValue(post.title)
            }" class="w-full h-48 object-cover rounded-lg mb-4" />`
            : ""
        }
  <p class="text-gray-700 mb-2">${escapeHtml(post.excerpt)}</p>
  <div class="text-sm text-gray-500 mb-2">
    <time datetime="${escapeAttrValue(post.published_at ?? "")}">${
          post.published_at
            ? new Date(post.published_at).toLocaleDateString()
            : ""
        }</time>
    ${
          categories.length > 0
            ? `<span class="flex gap-2 inline-flex">${
              categories.map((c) =>
                `<a href="/blog/category/${
                  escapeAttrValue(c.slug)
                }" class="text-indigo-600 hover:text-indigo-800">${
                  escapeHtml(c.name)
                }</a>`
              ).join(", ")
            }</span>`
            : ""
        }
  </div>
</article>`;
      }),
    );

    const prevLink = page > 1
      ? `<a href="/blog?page=${
        page - 1
      }" class="text-indigo-600 hover:text-indigo-800" aria-label="Previous page">Previous</a>`
      : "";
    const nextLink = page < totalPages
      ? `<a href="/blog?page=${
        page + 1
      }" class="text-indigo-600 hover:text-indigo-800" aria-label="Next page">Next</a>`
      : "";

    const bodyHtml = `<div class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-bold text-gray-900 mb-8">Blog</h1>
  ${postItems.join("\n")}
  ${total === 0 ? '<p class="text-gray-500">No posts yet.</p>' : ""}
  <nav class="flex justify-between mt-8" aria-label="Blog pagination">${prevLink} ${nextLink}</nav>
</div>`;

    let html = await renderDynamicPage(
      {
        id: "blog-list",
        body: bodyHtml,
        title: "Blog",
        seo_title: "Blog",
        seo_description: "Blog posts",
        template: "blog-list",
      },
      appPath,
      undefined,
      { url: url.href, type: "website" },
    );
    html = injectHeadTags(html, RSS_DISCOVERY_TAG);

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  };
  routes.push(blogListRoute);

  // GET /blog/rss.xml — RSS 2.0 feed
  const rssRoute = new Route({
    path: "/blog/rss.xml",
    regex: /^\/blog\/rss\.xml$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  rssRoute.method = "GET";
  rssRoute.run = (req: Request) => {
    const url = new URL(req.url);
    const siteUrl = `${url.protocol}//${url.host}`;
    const xml = registry.generateRSS("Blog", siteUrl);
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    });
  };
  routes.push(rssRoute);

  // GET /blog/category/{slug} — posts filtered by category
  const categoryRoute = new Route({
    path: "/blog/category/[slug]",
    regex: /^\/blog\/category\/([^/]+)$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  categoryRoute.method = "GET";
  categoryRoute.run = async (
    req: Request,
    routeCtx?: { params: Record<string, string> },
  ) => {
    const catSlug = routeCtx?.params?.slug;
    if (!catSlug) return await blog404(appPath, "Category Not Found");

    // Resolve category slug to category object
    const catPlugin = ctx.plugins.find((p) => p instanceof CategoriesPlugin);
    if (!catPlugin) return await blog404(appPath, "Category Not Found");

    // Find category by slug (capped at 100; paginate if more categories needed)
    const allCategories = await catPlugin.storage.list({ page: 1, limit: 100 });
    const category = allCategories.find((c) => String(c.slug) === catSlug);
    if (!category) return await blog404(appPath, "Category Not Found");

    const url = new URL(req.url);
    const page = Math.max(
      1,
      parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
    );
    const { posts, total, totalPages } = registry.listPublished({
      page,
      limit: 10,
      categoryId: category.id,
    });

    const categoryName = String(category.name ?? catSlug);

    const postItems = await Promise.all(
      posts.map(async (post) => {
        const categories = await registry.getCategories(post.category_ids);
        return `<article class="mb-8 pb-8 border-b border-gray-200">
  <h2><a href="/blog/${escapeAttrValue(post.slug)}">${
          escapeHtml(post.title)
        }</a></h2>
  ${
          post.cover_image
            ? `<img src="${escapeAttrValue(post.cover_image)}" alt="${
              escapeAttrValue(post.title)
            }" class="w-full h-48 object-cover rounded-lg mb-4" />`
            : ""
        }
  <p>${escapeHtml(post.excerpt)}</p>
  <div class="text-sm text-gray-500 mb-2">
    <time datetime="${escapeAttrValue(post.published_at ?? "")}">${
          post.published_at
            ? new Date(post.published_at).toLocaleDateString()
            : ""
        }</time>
    ${
          categories.length > 0
            ? `<span class="flex gap-2 inline-flex">${
              categories.map((c) =>
                `<a href="/blog/category/${escapeAttrValue(c.slug)}">${
                  escapeHtml(c.name)
                }</a>`
              ).join(", ")
            }</span>`
            : ""
        }
  </div>
</article>`;
      }),
    );

    const prevLink = page > 1
      ? `<a href="/blog/category/${escapeAttrValue(catSlug)}?page=${
        page - 1
      }" aria-label="Previous page">Previous</a>`
      : "";
    const nextLink = page < totalPages
      ? `<a href="/blog/category/${escapeAttrValue(catSlug)}?page=${
        page + 1
      }" aria-label="Next page">Next</a>`
      : "";

    const bodyHtml = `<div class="max-w-3xl mx-auto">
  <h1>Blog — ${escapeHtml(categoryName)}</h1>
  ${postItems.join("\n")}
  ${total === 0 ? "<p>No posts in this category.</p>" : ""}
  <nav class="flex justify-between mt-8" aria-label="Category pagination">${prevLink} ${nextLink}</nav>
</div>`;

    let html = await renderDynamicPage(
      {
        id: `blog-category-${catSlug}`,
        body: bodyHtml,
        title: `Blog — ${categoryName}`,
        seo_title: `Blog — ${categoryName}`,
        seo_description: `Posts in category: ${categoryName}`,
        template: "blog-list",
      },
      appPath,
      undefined,
      { url: url.href, type: "website" },
    );
    html = injectHeadTags(html, RSS_DISCOVERY_TAG);

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  };
  routes.push(categoryRoute);

  // GET /blog/{slug} — single post
  const blogPostRoute = new Route({
    path: "/blog/[slug]",
    regex: /^\/blog\/([^/]+)$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  blogPostRoute.method = "GET";
  blogPostRoute.run = async (
    req: Request,
    routeCtx?: { params: Record<string, string> },
  ) => {
    const slug = routeCtx?.params?.slug;
    if (!slug) return await blog404(appPath, "Post Not Found");

    const post = registry.match(`/blog/${slug}`);
    if (!post) return await blog404(appPath, "Post Not Found");

    const categories = await registry.getCategories(post.category_ids);

    const categoryHtml = categories.length > 0
      ? `<div class="flex gap-2 inline-flex">${
        categories.map((c) =>
          `<a href="/blog/category/${
            escapeAttrValue(c.slug)
          }" class="text-indigo-600 hover:text-indigo-800">${
            escapeHtml(c.name)
          }</a>`
        ).join(", ")
      }</div>`
      : "";

    const bodyHtml = `<article class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-bold text-gray-900 mb-4">${
      escapeHtml(post.title)
    }</h1>
  ${
      post.cover_image
        ? `<img src="${escapeAttrValue(post.cover_image)}" alt="${
          escapeAttrValue(post.title)
        }" class="w-full h-48 object-cover rounded-lg mb-4" />`
        : ""
    }
  <div class="text-sm text-gray-500 mb-2">
    <time datetime="${escapeAttrValue(post.published_at ?? "")}">${
      post.published_at ? new Date(post.published_at).toLocaleDateString() : ""
    }</time>
    ${categoryHtml}
  </div>
  <div class="mt-6 leading-relaxed text-gray-800 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h3]:text-lg [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic">${
      sanitizeHtml(post.body)
    }</div>
</article>`;

    const seoDescription = post.excerpt || post.title;

    const url = new URL(req.url);
    let html = await renderDynamicPage(
      {
        id: post.id,
        body: bodyHtml,
        title: post.title,
        seo_title: post.title,
        seo_description: seoDescription,
        template: "blog-post",
      },
      appPath,
      undefined,
      {
        url: url.href,
        type: "article",
        ogImage: post.cover_image || undefined,
      },
    );
    html = injectHeadTags(html, RSS_DISCOVERY_TAG);

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  };
  routes.push(blogPostRoute);
}
