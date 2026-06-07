import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { BlogRouteRegistry } from "../src/routing/blogRouteRegistry.ts";
import { InMemoryStorage } from "../src/models/Storage.ts";
import type { StorageItem } from "../src/models/Storage.ts";

function post(overrides: Partial<StorageItem> & { id: string }): StorageItem {
  return {
    status: "published",
    slug: `slug-${overrides.id}`,
    title: `Title ${overrides.id}`,
    published_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("BlogRouteRegistry", () => {
  describe("register", () => {
    it("registers a published post and parses category_ids", () => {
      const reg = new BlogRouteRegistry();
      const result = reg.register(
        post({ id: "1", category_ids: '["a","b"]' }),
      );
      assertEquals(result?.id, "1");
      assertEquals(result?.category_ids, ["a", "b"]);
      assertEquals(reg.size, 1);
    });

    it("returns null for draft posts", () => {
      const reg = new BlogRouteRegistry();
      assertEquals(reg.register(post({ id: "1", status: "draft" })), null);
      assertEquals(reg.size, 0);
    });

    it("returns null for posts without a slug", () => {
      const reg = new BlogRouteRegistry();
      assertEquals(reg.register(post({ id: "1", slug: "" })), null);
    });

    it("degrades to empty category_ids on invalid/none JSON", () => {
      const reg = new BlogRouteRegistry();
      assertEquals(
        reg.register(post({ id: "1", category_ids: "nope" }))
          ?.category_ids,
        [],
      );
      assertEquals(
        reg.register(post({ id: "2", category_ids: '{"x":1}' }))
          ?.category_ids,
        [],
      );
      assertEquals(reg.register(post({ id: "3" }))?.category_ids, []);
    });
  });

  describe("unregister", () => {
    it("removes a post and reports whether it existed", () => {
      const reg = new BlogRouteRegistry();
      reg.register(post({ id: "1" }));
      assertEquals(reg.unregister("1"), true);
      assertEquals(reg.unregister("1"), false);
      assertEquals(reg.size, 0);
    });
  });

  describe("match", () => {
    it("matches /blog/{slug} to a registered post", () => {
      const reg = new BlogRouteRegistry();
      reg.register(post({ id: "1", slug: "hello" }));
      assertEquals(reg.match("/blog/hello")?.id, "1");
    });

    it("returns null for an unknown slug", () => {
      const reg = new BlogRouteRegistry();
      reg.register(post({ id: "1", slug: "hello" }));
      assertEquals(reg.match("/blog/missing"), null);
    });

    it("returns null for a non-blog path", () => {
      const reg = new BlogRouteRegistry();
      assertEquals(reg.match("/about"), null);
    });
  });

  describe("listPublished", () => {
    function seed(reg: BlogRouteRegistry, n: number) {
      for (let i = 0; i < n; i++) {
        reg.register(post({
          id: String(i),
          slug: `s${i}`,
          published_at: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          category_ids: i % 2 === 0 ? '["even"]' : '["odd"]',
        }));
      }
    }

    it("paginates and reports totals", () => {
      const reg = new BlogRouteRegistry();
      seed(reg, 25);
      const r = reg.listPublished({ page: 2, limit: 10 });
      assertEquals(r.total, 25);
      assertEquals(r.totalPages, 3);
      assertEquals(r.posts.length, 10);
    });

    it("filters by category", () => {
      const reg = new BlogRouteRegistry();
      seed(reg, 10);
      const r = reg.listPublished({ categoryId: "even", limit: 50 });
      assertEquals(r.total, 5);
      assertEquals(r.posts.every((p) => p.category_ids.includes("even")), true);
    });

    it("clamps limit and page to safe ranges", () => {
      const reg = new BlogRouteRegistry();
      seed(reg, 60);
      assertEquals(reg.listPublished({ limit: 999 }).posts.length, 50); // max 50
      assertEquals(reg.listPublished({ limit: 0 }).posts.length, 1); // min 1
      // page < 1 is clamped to 1
      assertEquals(
        reg.listPublished({ page: -5, limit: 10 }).posts.length,
        10,
      );
    });

    it("defaults to an empty result set", () => {
      const r = new BlogRouteRegistry().listPublished();
      assertEquals(r.total, 0);
      assertEquals(r.totalPages, 1);
      assertEquals(r.posts, []);
    });
  });

  describe("all / size sorting", () => {
    it("sorts posts by published_at DESC", () => {
      const reg = new BlogRouteRegistry();
      reg.register(post({ id: "old", published_at: "2024-01-01T00:00:00Z" }));
      reg.register(post({ id: "new", published_at: "2024-12-01T00:00:00Z" }));
      assertEquals(reg.all().map((p) => p.id), ["new", "old"]);
      assertEquals(reg.size, 2);
    });
  });

  describe("getCategories", () => {
    it("returns [] when no category storage is set", async () => {
      assertEquals(await new BlogRouteRegistry().getCategories(["a"]), []);
    });

    it("returns [] for an empty id list", async () => {
      const reg = new BlogRouteRegistry();
      reg.setStorage(new InMemoryStorage(), new InMemoryStorage());
      assertEquals(await reg.getCategories([]), []);
    });

    it("resolves existing categories and skips missing ones", async () => {
      const reg = new BlogRouteRegistry();
      const cats = new InMemoryStorage();
      await cats.set("c1", {
        id: "c1",
        name: "Tech",
        slug: "tech",
        description: "d",
      });
      reg.setStorage(new InMemoryStorage(), cats);
      const result = await reg.getCategories(["c1", "missing"]);
      assertEquals(result.length, 1);
      assertEquals(result[0].name, "Tech");
    });
  });

  describe("generateRSS", () => {
    it("renders an RSS feed with escaped post data", () => {
      const reg = new BlogRouteRegistry();
      reg.register(post({
        id: "1",
        slug: "hi",
        title: "A & B <ok>",
        excerpt: "x",
        published_at: "2024-01-01T00:00:00Z",
      }));
      const xml = reg.generateRSS("My Blog", "https://ex.com");
      assertStringIncludes(xml, "<title>My Blog</title>");
      assertStringIncludes(xml, "https://ex.com/blog/hi");
      assertStringIncludes(xml, "A &amp; B &lt;ok&gt;");
      assertStringIncludes(xml, "<pubDate>");
    });

    it("renders a valid feed with no items", () => {
      const xml = new BlogRouteRegistry().generateRSS(
        "Empty",
        "https://ex.com",
      );
      assertStringIncludes(xml, "<channel>");
      assertEquals(xml.includes("<item>"), false);
    });
  });

  describe("loadFromStorage", () => {
    it("rejects when no storage is set", async () => {
      await assertRejects(
        () => new BlogRouteRegistry().loadFromStorage(),
        Error,
        "no storage set",
      );
    });

    it("loads only published posts, across pages, clearing first", async () => {
      const reg = new BlogRouteRegistry();
      const posts = new InMemoryStorage();
      // 120 published (forces >1 page at pageSize 100) + 1 draft
      for (let i = 0; i < 120; i++) {
        await posts.set(`p${i}`, post({ id: `p${i}`, slug: `s${i}` }));
      }
      await posts.set("d", post({ id: "d", slug: "draft", status: "draft" }));
      reg.setStorage(posts, new InMemoryStorage());

      // Pre-seed a stale post to prove clear() runs.
      reg.register(post({ id: "stale", slug: "stale" }));

      await reg.loadFromStorage();
      assertEquals(reg.size, 120);
      assertEquals(reg.match("/blog/draft"), null);
      assertEquals(reg.match("/blog/stale"), null);
    });
  });
});
