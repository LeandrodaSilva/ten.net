import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderDynamicPage } from "../src/routing/dynamicPageHandler.ts";
import type { StorageItem } from "../src/models/Storage.ts";

async function withApp(
  documentHtml: string,
  fn: (appPath: string) => Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "tennet_dyn_" });
  try {
    await Deno.writeTextFile(`${dir}/document.html`, documentHtml);
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true }).catch(() => {});
  }
}

describe("renderDynamicPage", () => {
  it("injects SEO/OG tags, replaces title, and inlines Tailwind", async () => {
    const doc =
      `<html><head><title>old</title>{{seo_title}} {{seo_description}}</head><body>{{content}}</body></html>`;
    await withApp(doc, async (appPath) => {
      const item: StorageItem = {
        id: "1",
        body: "<p>hi</p>",
        title: "T",
        seo_title: "A & B",
        seo_description: 'desc "x"',
        widgets_enabled: "false",
      };
      const html = await renderDynamicPage(
        item,
        appPath,
        undefined,
        {
          url: "https://u.test/p",
          type: "article",
          ogImage: "https://i.test/x.png",
        },
        undefined,
        "body{color:red}",
      );

      assertStringIncludes(html, "<p>hi</p>"); // body content
      assertStringIncludes(html, "<title>A &amp; B</title>"); // title replaced+escaped
      assertStringIncludes(html, 'property="og:title" content="A &amp; B"');
      assertStringIncludes(
        html,
        'property="og:url" content="https://u.test/p"',
      );
      assertStringIncludes(html, 'property="og:type" content="article"');
      assertStringIncludes(html, 'property="og:image"');
      assertStringIncludes(
        html,
        'name="twitter:card" content="summary_large_image"',
      );
      assertStringIncludes(html, '<style id="tw">body{color:red}</style>');
    });
  });

  it("inserts a meta description when the document lacks one", async () => {
    const doc =
      `<html><head><title>t</title></head><body>{{content}}</body></html>`;
    await withApp(doc, async (appPath) => {
      const html = await renderDynamicPage(
        { id: "2", body: "x", title: "T", seo_description: "Hello desc" },
        appPath,
      );
      assertStringIncludes(
        html,
        '<meta name="description" content="Hello desc">',
      );
      assertStringIncludes(html, 'property="og:type" content="website"'); // default type
    });
  });

  it("resolves widgets when enabled", async () => {
    const doc =
      `<html><head><title>t</title></head><body>{{content}}</body></html>`;
    await withApp(doc, async (appPath) => {
      const item: StorageItem = {
        id: "3",
        body: "base",
        title: "T",
        widgets_enabled: "true",
      };
      const html = await renderDynamicPage(
        item,
        appPath,
        {} as unknown as Deno.Kv,
        undefined,
        (_id, body) => Promise.resolve(`${body}[widget]`),
      );
      assertStringIncludes(html, "base[widget]");
    });
  });

  it("renders with no SEO fields at all", async () => {
    const doc =
      `<html><head><title>t</title></head><body>{{content}}</body></html>`;
    await withApp(doc, async (appPath) => {
      const html = await renderDynamicPage({ id: "4", body: "plain" }, appPath);
      assertStringIncludes(html, "plain");
      assertEquals(html.includes("og:image"), false);
    });
  });
});
