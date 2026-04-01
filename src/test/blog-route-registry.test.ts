import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { BlogRouteRegistry } from "../../packages/core/src/routing/blogRouteRegistry.ts";
import { InMemoryStorage } from "../../packages/core/src/models/Storage.ts";

/** Helper: create a published StorageItem for the registry. */
function publishedItem(overrides?: Record<string, unknown>) {
  return {
    id: "post-1",
    slug: "hello-world",
    title: "Hello World",
    excerpt: "A brief intro",
    body: "<p>Content</p>",
    cover_image: "",
    status: "published",
    category_ids: "",
    author_id: "",
    published_at: "2025-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("BlogRouteRegistry", () => {
  describe("register / unregister", () => {
    it("should register a published post", () => {
      const registry = new BlogRouteRegistry();
      const post = registry.register(publishedItem());
      assertEquals(post !== null, true);
      assertEquals(post!.slug, "hello-world");
      assertEquals(registry.size, 1);
    });

    it("should ignore draft posts", () => {
      const registry = new BlogRouteRegistry();
      const post = registry.register(publishedItem({ status: "draft" }));
      assertEquals(post, null);
      assertEquals(registry.size, 0);
    });

    it("should ignore posts without slug", () => {
      const registry = new BlogRouteRegistry();
      const post = registry.register(publishedItem({ slug: "" }));
      assertEquals(post, null);
      assertEquals(registry.size, 0);
    });

    it("should unregister a post by ID", () => {
      const registry = new BlogRouteRegistry();
      registry.register(publishedItem());
      assertEquals(registry.size, 1);

      const removed = registry.unregister("post-1");
      assertEquals(removed, true);
      assertEquals(registry.size, 0);
    });

    it("should return false when unregistering non-existent ID", () => {
      const registry = new BlogRouteRegistry();
      const removed = registry.unregister("nonexistent");
      assertEquals(removed, false);
    });

    it("should parse category_ids from JSON string", () => {
      const registry = new BlogRouteRegistry();
      const post = registry.register(
        publishedItem({ category_ids: '["cat-1","cat-2"]' }),
      );
      assertEquals(post!.category_ids, ["cat-1", "cat-2"]);
    });

    it("should handle invalid category_ids JSON gracefully", () => {
      const registry = new BlogRouteRegistry();
      const post = registry.register(
        publishedItem({ category_ids: "not-json" }),
      );
      assertEquals(post!.category_ids, []);
    });
  });

  describe("match", () => {
    it("should match /blog/{slug} to a registered post", () => {
      const registry = new BlogRouteRegistry();
      registry.register(publishedItem({ slug: "my-post" }));

      const matched = registry.match("/blog/my-post");
      assertEquals(matched !== null, true);
      assertEquals(matched!.slug, "my-post");
    });

    it("should return null for unmatched slug", () => {
      const registry = new BlogRouteRegistry();
      registry.register(publishedItem({ slug: "my-post" }));

      const matched = registry.match("/blog/other-post");
      assertEquals(matched, null);
    });

    it("should return null for non-blog paths", () => {
      const registry = new BlogRouteRegistry();
      registry.register(publishedItem());

      assertEquals(registry.match("/about"), null);
      assertEquals(registry.match("/blog"), null);
      assertEquals(registry.match("/blog/"), null);
    });

    it("should return null for nested paths beyond /blog/{slug}", () => {
      const registry = new BlogRouteRegistry();
      registry.register(publishedItem());

      assertEquals(registry.match("/blog/hello-world/comments"), null);
    });
  });

  describe("listPublished", () => {
    it("should return all published posts sorted by date DESC", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({
          id: "p1",
          slug: "older",
          published_at: "2025-01-01T00:00:00.000Z",
        }),
      );
      registry.register(
        publishedItem({
          id: "p2",
          slug: "newer",
          published_at: "2025-06-01T00:00:00.000Z",
        }),
      );

      const { posts, total } = registry.listPublished();
      assertEquals(total, 2);
      assertEquals(posts[0].slug, "newer");
      assertEquals(posts[1].slug, "older");
    });

    it("should paginate results", () => {
      const registry = new BlogRouteRegistry();
      for (let i = 1; i <= 5; i++) {
        registry.register(
          publishedItem({
            id: `p${i}`,
            slug: `post-${i}`,
            published_at: `2025-0${i}-01T00:00:00.000Z`,
          }),
        );
      }

      const page1 = registry.listPublished({ page: 1, limit: 2 });
      assertEquals(page1.posts.length, 2);
      assertEquals(page1.total, 5);
      assertEquals(page1.totalPages, 3);

      const page2 = registry.listPublished({ page: 2, limit: 2 });
      assertEquals(page2.posts.length, 2);

      const page3 = registry.listPublished({ page: 3, limit: 2 });
      assertEquals(page3.posts.length, 1);
    });

    it("should filter by categoryId", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({
          id: "p1",
          slug: "tech-post",
          category_ids: '["cat-tech"]',
        }),
      );
      registry.register(
        publishedItem({
          id: "p2",
          slug: "news-post",
          category_ids: '["cat-news"]',
        }),
      );
      registry.register(
        publishedItem({
          id: "p3",
          slug: "both-post",
          category_ids: '["cat-tech","cat-news"]',
        }),
      );

      const techPosts = registry.listPublished({ categoryId: "cat-tech" });
      assertEquals(techPosts.total, 2);
      const slugs = techPosts.posts.map((p) => p.slug);
      assertEquals(slugs.includes("tech-post"), true);
      assertEquals(slugs.includes("both-post"), true);
    });

    it("should return empty result with no posts", () => {
      const registry = new BlogRouteRegistry();
      const result = registry.listPublished();
      assertEquals(result.total, 0);
      assertEquals(result.posts.length, 0);
      assertEquals(result.totalPages, 1);
    });

    it("should use default page 1 and limit 10", () => {
      const registry = new BlogRouteRegistry();
      registry.register(publishedItem());
      const result = registry.listPublished();
      assertEquals(result.posts.length, 1);
    });

    it("should cap limit at 50 (SEC-05)", () => {
      const registry = new BlogRouteRegistry();
      for (let i = 1; i <= 60; i++) {
        registry.register(
          publishedItem({
            id: `p${i}`,
            slug: `post-${i}`,
            published_at: `2025-01-${String(i).padStart(2, "0")}T00:00:00.000Z`,
          }),
        );
      }

      const result = registry.listPublished({ limit: 100 });
      assertEquals(result.posts.length, 50);
      assertEquals(result.total, 60);
    });

    it("should enforce minimum limit of 1", () => {
      const registry = new BlogRouteRegistry();
      registry.register(publishedItem());

      const result = registry.listPublished({ limit: 0 });
      assertEquals(result.posts.length, 1);

      const resultNeg = registry.listPublished({ limit: -5 });
      assertEquals(resultNeg.posts.length, 1);
    });

    it("should clamp negative page to 1 (SEC-06)", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({ id: "p1", slug: "post-1" }),
      );

      const result = registry.listPublished({ page: -1 });
      assertEquals(result.posts.length, 1);
      assertEquals(result.posts[0].slug, "post-1");
    });

    it("should clamp page 0 to page 1 (SEC-06)", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({ id: "p1", slug: "post-1" }),
      );

      const result = registry.listPublished({ page: 0 });
      assertEquals(result.posts.length, 1);
    });
  });

  describe("getCategories", () => {
    it("should resolve category IDs from storage", async () => {
      const registry = new BlogRouteRegistry();
      const postStorage = new InMemoryStorage();
      const catStorage = new InMemoryStorage();
      registry.setStorage(postStorage, catStorage);

      await catStorage.set("cat-1", {
        id: "cat-1",
        name: "Technology",
        slug: "tech",
        description: "Tech posts",
      });
      await catStorage.set("cat-2", {
        id: "cat-2",
        name: "News",
        slug: "news",
        description: "News posts",
      });

      const categories = await registry.getCategories(["cat-1", "cat-2"]);
      assertEquals(categories.length, 2);
      assertEquals(categories[0].name, "Technology");
      assertEquals(categories[1].name, "News");
    });

    it("should skip non-existent category IDs", async () => {
      const registry = new BlogRouteRegistry();
      const postStorage = new InMemoryStorage();
      const catStorage = new InMemoryStorage();
      registry.setStorage(postStorage, catStorage);

      await catStorage.set("cat-1", {
        id: "cat-1",
        name: "Technology",
        slug: "tech",
        description: "",
      });

      const categories = await registry.getCategories([
        "cat-1",
        "cat-nonexistent",
      ]);
      assertEquals(categories.length, 1);
      assertEquals(categories[0].name, "Technology");
    });

    it("should return empty array for empty category IDs", async () => {
      const registry = new BlogRouteRegistry();
      const postStorage = new InMemoryStorage();
      const catStorage = new InMemoryStorage();
      registry.setStorage(postStorage, catStorage);

      const categories = await registry.getCategories([]);
      assertEquals(categories.length, 0);
    });

    it("should return empty array when no category storage is set", async () => {
      const registry = new BlogRouteRegistry();
      const categories = await registry.getCategories(["cat-1"]);
      assertEquals(categories.length, 0);
    });
  });

  describe("generateRSS", () => {
    it("should generate valid RSS 2.0 XML", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({
          id: "p1",
          slug: "first-post",
          title: "First Post",
          excerpt: "Intro text",
          published_at: "2025-06-01T00:00:00.000Z",
        }),
      );

      const rss = registry.generateRSS("My Blog", "https://example.com");
      assertStringIncludes(rss, '<?xml version="1.0" encoding="UTF-8"?>');
      assertStringIncludes(rss, '<rss version="2.0">');
      assertStringIncludes(rss, "<channel>");
      assertStringIncludes(rss, "<title>My Blog</title>");
      assertStringIncludes(
        rss,
        "<link>https://example.com/blog</link>",
      );
      assertStringIncludes(rss, "<item>");
      assertStringIncludes(rss, "<title>First Post</title>");
      assertStringIncludes(
        rss,
        "<link>https://example.com/blog/first-post</link>",
      );
      assertStringIncludes(rss, "<description>Intro text</description>");
      assertStringIncludes(rss, "<pubDate>");
      assertStringIncludes(
        rss,
        '<guid isPermaLink="true">https://example.com/blog/first-post</guid>',
      );
    });

    it("should escape XML special characters in title and excerpt", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({
          id: "p1",
          slug: "special",
          title: 'Post & "Title" <br>',
          excerpt: "A <b>bold</b> & 'cool' excerpt",
        }),
      );

      const rss = registry.generateRSS("My Blog", "https://example.com");
      assertStringIncludes(
        rss,
        "Post &amp; &quot;Title&quot; &lt;br&gt;",
      );
      assertStringIncludes(
        rss,
        "A &lt;b&gt;bold&lt;/b&gt; &amp; &apos;cool&apos; excerpt",
      );
    });

    it("should escape XML in siteUrl and siteTitle (SEC-08)", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({
          id: "p1",
          slug: "test",
          title: "Test",
          excerpt: "Excerpt",
        }),
      );

      const rss = registry.generateRSS(
        'Blog & "Friends"',
        "https://example.com?a=1&b=2",
      );
      assertStringIncludes(rss, "Blog &amp; &quot;Friends&quot;");
      assertStringIncludes(
        rss,
        "<link>https://example.com?a=1&amp;b=2/blog</link>",
      );
      assertStringIncludes(
        rss,
        "https://example.com?a=1&amp;b=2/blog/test",
      );
    });

    it("should limit to 20 posts maximum", () => {
      const registry = new BlogRouteRegistry();
      for (let i = 1; i <= 25; i++) {
        registry.register(
          publishedItem({
            id: `p${i}`,
            slug: `post-${i}`,
            title: `Post ${i}`,
            published_at: `2025-01-${String(i).padStart(2, "0")}T00:00:00.000Z`,
          }),
        );
      }

      const rss = registry.generateRSS("My Blog", "https://example.com");
      const itemCount = (rss.match(/<item>/g) || []).length;
      assertEquals(itemCount, 20);
    });

    it("should generate empty feed with no posts", () => {
      const registry = new BlogRouteRegistry();
      const rss = registry.generateRSS("Empty Blog", "https://example.com");
      assertStringIncludes(rss, "<title>Empty Blog</title>");
      assertEquals(rss.includes("<item>"), false);
    });

    it("should order posts by published_at DESC", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({
          id: "p1",
          slug: "old",
          title: "Old",
          published_at: "2025-01-01T00:00:00.000Z",
        }),
      );
      registry.register(
        publishedItem({
          id: "p2",
          slug: "new",
          title: "New",
          published_at: "2025-12-01T00:00:00.000Z",
        }),
      );

      const rss = registry.generateRSS("Blog", "https://example.com");
      const newPos = rss.indexOf("<title>New</title>");
      const oldPos = rss.indexOf("<title>Old</title>");
      assertEquals(newPos < oldPos, true);
    });
  });

  describe("loadFromStorage", () => {
    it("should load published posts from storage", async () => {
      const registry = new BlogRouteRegistry();
      const postStorage = new InMemoryStorage();
      const catStorage = new InMemoryStorage();
      registry.setStorage(postStorage, catStorage);

      await postStorage.set("p1", publishedItem({ id: "p1", slug: "post-1" }));
      await postStorage.set(
        "p2",
        publishedItem({
          id: "p2",
          slug: "post-2",
          status: "draft",
        }),
      );
      await postStorage.set("p3", publishedItem({ id: "p3", slug: "post-3" }));

      await registry.loadFromStorage();
      assertEquals(registry.size, 2);
    });

    it("should clear existing posts before loading", async () => {
      const registry = new BlogRouteRegistry();
      const postStorage = new InMemoryStorage();
      const catStorage = new InMemoryStorage();
      registry.setStorage(postStorage, catStorage);

      registry.register(publishedItem({ id: "manual", slug: "manual-post" }));
      assertEquals(registry.size, 1);

      await registry.loadFromStorage();
      assertEquals(registry.size, 0);
    });

    it("should throw when no storage is set", async () => {
      const registry = new BlogRouteRegistry();
      let error: Error | null = null;
      try {
        await registry.loadFromStorage();
      } catch (e) {
        error = e as Error;
      }
      assertEquals(error !== null, true);
      assertStringIncludes(error!.message, "no storage set");
    });
  });

  describe("all() and size", () => {
    it("should return all posts sorted by date DESC", () => {
      const registry = new BlogRouteRegistry();
      registry.register(
        publishedItem({
          id: "p1",
          slug: "old",
          published_at: "2025-01-01T00:00:00.000Z",
        }),
      );
      registry.register(
        publishedItem({
          id: "p2",
          slug: "new",
          published_at: "2025-12-01T00:00:00.000Z",
        }),
      );

      const all = registry.all();
      assertEquals(all.length, 2);
      assertEquals(all[0].slug, "new");
      assertEquals(all[1].slug, "old");
    });

    it("should return correct size", () => {
      const registry = new BlogRouteRegistry();
      assertEquals(registry.size, 0);
      registry.register(publishedItem({ id: "p1", slug: "a" }));
      assertEquals(registry.size, 1);
      registry.register(publishedItem({ id: "p2", slug: "b" }));
      assertEquals(registry.size, 2);
    });
  });
});
