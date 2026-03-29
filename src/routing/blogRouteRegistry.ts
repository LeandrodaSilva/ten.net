import type { Storage, StorageItem } from "../models/Storage.ts";

/** Shape of a blog post stored in the registry. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_image: string;
  status: "draft" | "published";
  category_ids: string[];
  author_id: string;
  published_at: string;
}

/** Shape of a blog category resolved from storage. */
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

/** Escape special XML characters for safe RSS output. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Regex to extract a slug from /blog/{slug} paths. */
const BLOG_SLUG_REGEX = /^\/blog\/([^/]+)$/;

/**
 * Registry that keeps published blog posts in memory,
 * synchronized with the underlying Storage backends for posts and categories.
 *
 * Only published posts are registered. Posts are sorted by published_at DESC.
 */
export class BlogRouteRegistry {
  private _posts = new Map<string, BlogPost>();
  private _postStorage: Storage | null = null;
  private _categoryStorage: Storage | null = null;

  /** Bind storage instances for posts and categories. */
  setStorage(postStorage: Storage, categoryStorage: Storage): void {
    this._postStorage = postStorage;
    this._categoryStorage = categoryStorage;
  }

  /**
   * Load all published posts from the bound Storage and register them.
   * Clears existing posts before loading.
   * Requires setStorage() to have been called first.
   */
  async loadFromStorage(): Promise<void> {
    if (!this._postStorage) {
      throw new Error(
        "BlogRouteRegistry: no storage set. Call setStorage() first.",
      );
    }

    this._posts.clear();

    const total = await this._postStorage.count();
    const pageSize = 100;
    const totalPages = Math.ceil(total / pageSize) || 1;

    for (let page = 1; page <= totalPages; page++) {
      const items = await this._postStorage.list({ page, limit: pageSize });
      for (const item of items) {
        if (String(item.status) === "published" && item.slug) {
          this.register(item);
        }
      }
    }
  }

  /**
   * Register a published post in the registry.
   * Returns null for non-published posts or posts without a slug.
   * Parses category_ids from JSON string to array.
   */
  register(item: StorageItem): BlogPost | null {
    const slug = String(item.slug ?? "");
    const status = String(item.status ?? "draft");

    if (status !== "published" || !slug) return null;

    let categoryIds: string[] = [];
    const rawCategoryIds = item.category_ids;
    if (typeof rawCategoryIds === "string" && rawCategoryIds !== "") {
      try {
        const parsed = JSON.parse(rawCategoryIds);
        if (Array.isArray(parsed)) {
          categoryIds = parsed.map(String);
        }
      } catch {
        // Graceful degradation: empty array on parse failure
      }
    }

    const post: BlogPost = {
      id: item.id,
      slug,
      title: String(item.title ?? ""),
      excerpt: String(item.excerpt ?? ""),
      body: String(item.body ?? ""),
      cover_image: String(item.cover_image ?? ""),
      status: "published",
      category_ids: categoryIds,
      author_id: String(item.author_id ?? ""),
      published_at: String(item.published_at ?? ""),
    };

    this._posts.set(item.id, post);
    return post;
  }

  /** Remove a post from the registry by ID. Returns true if found. */
  unregister(id: string): boolean {
    return this._posts.delete(id);
  }

  /**
   * Match a URL pathname against /blog/{slug}.
   * Returns the matched BlogPost or null.
   */
  match(pathname: string): BlogPost | null {
    const m = BLOG_SLUG_REGEX.exec(pathname);
    if (!m) return null;

    const slug = m[1];
    for (const post of this._posts.values()) {
      if (post.slug === slug) {
        return post;
      }
    }
    return null;
  }

  /**
   * List published posts with pagination.
   * Supports optional category filter by category ID.
   */
  listPublished(
    options: { page?: number; limit?: number; categoryId?: string } = {},
  ): { posts: BlogPost[]; total: number; totalPages: number } {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);

    let posts = this._sortedPosts();

    if (options.categoryId) {
      posts = posts.filter((p) => p.category_ids.includes(options.categoryId!));
    }

    const total = posts.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = posts.slice(start, start + limit);

    return { posts: paginated, total, totalPages };
  }

  /**
   * Resolve category IDs to category objects from category storage.
   * Filters out categories that no longer exist (graceful degradation).
   */
  async getCategories(categoryIds: string[]): Promise<BlogCategory[]> {
    if (!this._categoryStorage || categoryIds.length === 0) {
      return [];
    }

    const categories: BlogCategory[] = [];
    for (const id of categoryIds) {
      const item = await this._categoryStorage.get(id);
      if (item) {
        categories.push({
          id: item.id,
          name: String(item.name ?? ""),
          slug: String(item.slug ?? ""),
          description: String(item.description ?? ""),
        });
      }
    }
    return categories;
  }

  /**
   * Generate an RSS 2.0 XML feed from the latest published posts.
   * Returns at most 20 posts, ordered by published_at DESC.
   */
  generateRSS(siteTitle: string, siteUrl: string): string {
    const posts = this._sortedPosts().slice(0, 20);
    const blogUrl = `${siteUrl}/blog`;

    const items = posts.map((post) => {
      const link = `${escapeXml(siteUrl)}/blog/${escapeXml(post.slug)}`;
      const pubDate = post.published_at
        ? new Date(post.published_at).toUTCString()
        : "";

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${escapeXml(blogUrl)}</link>
    <description>Blog feed</description>
${items}
  </channel>
</rss>`;
  }

  /** Get all registered posts, sorted by published_at DESC. */
  all(): BlogPost[] {
    return this._sortedPosts();
  }

  /** Get the number of registered posts. */
  get size(): number {
    return this._posts.size;
  }

  /** Return posts sorted by published_at descending. */
  private _sortedPosts(): BlogPost[] {
    return Array.from(this._posts.values()).sort((a, b) =>
      b.published_at.localeCompare(a.published_at)
    );
  }
}
