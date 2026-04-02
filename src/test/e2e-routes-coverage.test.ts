import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { Ten } from "../../packages/core/src/ten.ts";
import { AdminPlugin } from "../../packages/admin/src/plugins/adminPlugin.tsx";
import { PagePlugin } from "../../packages/admin/src/plugins/pagePlugin.ts";
import { PostsPlugin } from "../../packages/admin/src/plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../../packages/admin/src/plugins/categoriesPlugin.ts";
import { GroupsPlugin } from "../../packages/admin/src/plugins/groupsPlugin.ts";
import { UsersPlugin } from "../../packages/admin/src/plugins/usersPlugin.ts";
import { SettingsPlugin } from "../../packages/admin/src/plugins/settingsPlugin.ts";
import { RolesPlugin } from "../../packages/admin/src/plugins/rolesPlugin.ts";
import { AuditLogPlugin } from "../../packages/admin/src/plugins/auditLogPlugin.ts";
import { MediaPlugin } from "../../packages/admin/src/plugins/mediaPlugin.ts";
import { createPasswordHash } from "../../packages/admin/src/auth/passwordHasher.ts";
import type { UserStore } from "../../packages/admin/src/auth/userStore.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Login and return the session cookie string. */
async function login(
  baseUrl: string,
  username = "admin",
  password = "admin",
): Promise<string> {
  const res = await fetch(`${baseUrl}/admin/login`, {
    method: "POST",
    body: new URLSearchParams({ username, password }),
    redirect: "manual",
  });
  const cookie = res.headers.get("Set-Cookie") ?? "";
  await res.body?.cancel();
  return cookie.split(";")[0];
}

/** Authenticated fetch helper. */
function fetchAuth(
  baseUrl: string,
  path: string,
  cookie: string,
  options?: RequestInit,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options?.headers as Record<string, string> ?? {}),
      cookie,
    },
  });
}

/** Extract the CSRF token from an HTML page. */
function extractCsrf(html: string): string {
  const match = html.match(/name="_csrf"\s+value="([^"]+)"/) ??
    html.match(/value="([^"]+)"[^>]*name="_csrf"/) ??
    html.match(/name="?_csrf"?[^>]*value="([^"]+)"/);
  return match?.[1] ?? "";
}

/** Get CSRF token by fetching the "new" form for a plugin. */
async function getCsrf(
  baseUrl: string,
  cookie: string,
  pluginSlug: string,
): Promise<string> {
  const res = await fetchAuth(
    baseUrl,
    `/admin/plugins/${pluginSlug}/new`,
    cookie,
  );
  const body = await res.text();
  const token = extractCsrf(body);
  assert(token.length > 0, `CSRF token not found for ${pluginSlug}/new`);
  return token;
}

/** Create an item via the CRUD form POST. */
function createItem(
  baseUrl: string,
  cookie: string,
  pluginSlug: string,
  data: Record<string, string>,
  csrfToken: string,
): Promise<Response> {
  const form = new URLSearchParams({ ...data, _csrf: csrfToken });
  return fetch(`${baseUrl}/admin/plugins/${pluginSlug}`, {
    method: "POST",
    body: form,
    headers: { cookie },
    redirect: "manual",
  });
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe(
  "E2E Routes Coverage — Gaps",
  { sanitizeResources: false },
  () => {
    let server: Deno.HttpServer;
    let baseUrl: string;
    let cookie: string;
    let kv: Deno.Kv | undefined;
    let admin: AdminPlugin;

    const consoleSpy = {
      log: console.log,
      info: console.info,
      error: console.error,
    };

    beforeAll(async () => {
      console.log = () => {};
      console.info = () => {};
      console.error = () => {};

      const app = Ten.net();
      admin = new AdminPlugin({
        storage: "kv",
        kvPath: ":memory:",
        plugins: [
          PagePlugin,
          PostsPlugin,
          CategoriesPlugin,
          GroupsPlugin,
          UsersPlugin,
          SettingsPlugin,
          RolesPlugin,
          AuditLogPlugin,
          MediaPlugin,
        ],
      });
      await app.useAdmin(admin);
      server = await app.start({ port: 0, onListen: () => {} });
      const addr = server.addr as Deno.NetAddr;
      baseUrl = `http://localhost:${addr.port}`;

      kv = admin.kv;

      // Login as admin
      cookie = await login(baseUrl);
    });

    afterAll(async () => {
      if (server) {
        await server.shutdown();
      }
      if (kv) {
        kv.close();
      }
      console.log = consoleSpy.log;
      console.info = consoleSpy.info;
      console.error = consoleSpy.error;
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. SEO Routes
    // ──────────────────────────────────────────────────────────────────────────
    describe("SEO Routes", () => {
      it("GET /sitemap.xml should return 200 with XML content type", async () => {
        const res = await fetch(`${baseUrl}/sitemap.xml`);
        assertEquals(res.status, 200);
        const ct = res.headers.get("Content-Type") ?? "";
        assertStringIncludes(ct, "text/xml");
        const body = await res.text();
        assertStringIncludes(body, '<?xml version="1.0"');
        assertStringIncludes(body, "<urlset");
        assertStringIncludes(body, "<url>");
        // Homepage should always be present
        assertStringIncludes(body, "<loc>");
      });

      it("GET /sitemap.xml should contain published page URLs", async () => {
        // Create a published page first
        const csrfToken = await getCsrf(baseUrl, cookie, "page-plugin");
        const createRes = await createItem(
          baseUrl,
          cookie,
          "page-plugin",
          {
            slug: "seo-test-page",
            title: "SEO Test Page",
            body: "SEO content",
            status: "published",
            seo_title: "",
            seo_description: "",
            template: "",
            author_id: "",
            widgets_enabled: "false",
          },
          csrfToken,
        );
        assertEquals(createRes.status, 302);
        await createRes.body?.cancel();

        // Wait for dynamic registry to pick up the page
        // Re-fetch sitemap
        const res = await fetch(`${baseUrl}/sitemap.xml`);
        assertEquals(res.status, 200);
        const body = await res.text();
        assertStringIncludes(body, "seo-test-page");
      });

      it("GET /robots.txt should return 200 with text content", async () => {
        const res = await fetch(`${baseUrl}/robots.txt`);
        assertEquals(res.status, 200);
        const ct = res.headers.get("Content-Type") ?? "";
        assertStringIncludes(ct, "text/plain");
        const body = await res.text();
        assertStringIncludes(body, "User-agent: *");
        assertStringIncludes(body, "Disallow: /admin/");
        assertStringIncludes(body, "Sitemap:");
        assertStringIncludes(body, "/sitemap.xml");
      });

      it("GET /robots.txt should contain correct sitemap URL", async () => {
        const res = await fetch(`${baseUrl}/robots.txt`);
        const body = await res.text();
        // Should include full URL to sitemap
        assertMatch(body, /Sitemap:\s+http:\/\/localhost:\d+\/sitemap\.xml/);
      });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Page Preview
    // ──────────────────────────────────────────────────────────────────────────
    describe("Page Preview", () => {
      let pageId: string;

      it("should find the page ID for preview testing", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/page-plugin",
          cookie,
        );
        const body = await res.text();
        // Find the seo-test-page or any page ID
        const matches = body.match(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]+)/g,
        );
        assert(matches && matches.length > 0, "should find page IDs");
        const m = matches[0].match(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]+)/,
        );
        assert(m, "should extract page ID");
        pageId = m[1];
      });

      it("GET /admin/preview/{id} should return 200 with preview banner", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/preview/${pageId}`,
          cookie,
        );
        assertEquals(res.status, 200);
        const body = await res.text();
        assertStringIncludes(body, "Preview");
      });

      it("GET /admin/preview/{id} should have X-Robots-Tag: noindex", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/preview/${pageId}`,
          cookie,
        );
        assertEquals(res.headers.get("X-Robots-Tag"), "noindex");
        await res.body?.cancel();
      });

      it("GET /admin/preview/{id} should have Cache-Control: no-store", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/preview/${pageId}`,
          cookie,
        );
        assertEquals(res.headers.get("Cache-Control"), "no-store");
        await res.body?.cancel();
      });

      it("GET /admin/preview/{id} should have X-Frame-Options: SAMEORIGIN", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/preview/${pageId}`,
          cookie,
        );
        assertEquals(res.headers.get("X-Frame-Options"), "SAMEORIGIN");
        await res.body?.cancel();
      });

      it("GET /admin/preview/nonexistent should return 404", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/preview/00000000-0000-0000-0000-000000000000",
          cookie,
        );
        assertEquals(res.status, 404);
        await res.body?.cancel();
      });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Blog Category
    // ──────────────────────────────────────────────────────────────────────────
    describe("Blog Category Routes", () => {
      let categorySlug: string;

      it("should create a category for testing", async () => {
        const csrfToken = await getCsrf(baseUrl, cookie, "category-plugin");
        const res = await createItem(
          baseUrl,
          cookie,
          "category-plugin",
          {
            name: "E2E Test Category",
            slug: "e2e-test-cat",
            description: "Category for testing",
          },
          csrfToken,
        );
        assertEquals(res.status, 302);
        await res.body?.cancel();
        categorySlug = "e2e-test-cat";
      });

      it("should create a published post in the category", async () => {
        // First find category ID
        const listRes = await fetchAuth(
          baseUrl,
          "/admin/plugins/category-plugin",
          cookie,
        );
        const listBody = await listRes.text();
        const catIdMatch = listBody.match(
          /\/admin\/plugins\/category-plugin\/([a-f0-9-]+)/,
        );
        assert(catIdMatch, "should find category ID");
        const categoryId = catIdMatch[1];

        const csrfToken = await getCsrf(baseUrl, cookie, "post-plugin");
        const res = await createItem(
          baseUrl,
          cookie,
          "post-plugin",
          {
            slug: "cat-test-post",
            title: "Category Test Post",
            body: "Post in category",
            status: "published",
            excerpt: "",
            seo_title: "",
            seo_description: "",
            author_id: "",
            category_ids: JSON.stringify([categoryId]),
            published_at: new Date().toISOString(),
          },
          csrfToken,
        );
        assertEquals(res.status, 302);
        await res.body?.cancel();
      });

      it("GET /blog/category/{slug} with existing category should return 200", async () => {
        const res = await fetch(
          `${baseUrl}/blog/category/${categorySlug}`,
        );
        assertEquals(res.status, 200);
        const body = await res.text();
        assertStringIncludes(body, "E2E Test Category");
      });

      it("GET /blog/category/nonexistent should return 404", async () => {
        const res = await fetch(
          `${baseUrl}/blog/category/nonexistent-category-xyz`,
        );
        assertEquals(res.status, 404);
        const body = await res.text();
        assertStringIncludes(body, "Category Not Found");
      });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. RBAC Multi-Role
    // ──────────────────────────────────────────────────────────────────────────
    describe("RBAC Multi-Role Access Control", () => {
      let editorCookie: string;
      let viewerCookie: string;

      it("should create editor and viewer users", async () => {
        // Access the internal KV to create users with specific roles
        assert(kv, "KV should be available");

        const editorHash = await createPasswordHash("editor123");
        const editorUser = {
          id: crypto.randomUUID(),
          username: "testeditor",
          passwordHash: editorHash.hash,
          salt: editorHash.salt,
          role: "editor",
          createdAt: Date.now(),
        };

        const viewerHash = await createPasswordHash("viewer123");
        const viewerUser = {
          id: crypto.randomUUID(),
          username: "testviewer",
          passwordHash: viewerHash.hash,
          salt: viewerHash.salt,
          role: "viewer",
          createdAt: Date.now(),
        };

        // Store users directly in KV (same key pattern as DenoKvUserStore: ["auth", "users", username])
        await kv.set(["auth", "users", "testeditor"], editorUser);
        await kv.set(["auth", "users", "testviewer"], viewerUser);
      });

      it("editor should be able to login", async () => {
        editorCookie = await login(baseUrl, "testeditor", "editor123");
        assert(editorCookie.length > 0, "editor should get session cookie");
      });

      it("viewer should be able to login", async () => {
        viewerCookie = await login(baseUrl, "testviewer", "viewer123");
        assert(viewerCookie.length > 0, "viewer should get session cookie");
      });

      // Editor tests
      it("editor can access dashboard", async () => {
        const res = await fetchAuth(baseUrl, "/admin", editorCookie);
        assertEquals(res.status, 200);
        await res.body?.cancel();
      });

      it("editor can read page-plugin list", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/page-plugin",
          editorCookie,
        );
        assertEquals(res.status, 200);
        await res.body?.cancel();
      });

      it("editor can access page-plugin/new form", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/page-plugin/new",
          editorCookie,
        );
        assertEquals(res.status, 200);
        await res.body?.cancel();
      });

      it("editor can create a page", async () => {
        const csrfToken = await getCsrf(
          baseUrl,
          editorCookie,
          "page-plugin",
        );
        const res = await createItem(
          baseUrl,
          editorCookie,
          "page-plugin",
          {
            slug: "editor-test-page",
            title: "Editor Test Page",
            body: "Created by editor",
            status: "draft",
            seo_title: "",
            seo_description: "",
            template: "",
            author_id: "",
            widgets_enabled: "false",
          },
          csrfToken,
        );
        assertEquals(res.status, 302);
        await res.body?.cancel();
      });

      it("editor CANNOT access user-plugin (users resource)", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/user-plugin",
          editorCookie,
        );
        assertEquals(res.status, 403);
        await res.body?.cancel();
      });

      it("editor CANNOT access settings-plugin", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/settings-plugin",
          editorCookie,
        );
        assertEquals(res.status, 403);
        await res.body?.cancel();
      });

      // Viewer tests
      it("viewer can access dashboard", async () => {
        const res = await fetchAuth(baseUrl, "/admin", viewerCookie);
        assertEquals(res.status, 200);
        await res.body?.cancel();
      });

      it("viewer can read page-plugin list", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/page-plugin",
          viewerCookie,
        );
        assertEquals(res.status, 200);
        await res.body?.cancel();
      });

      it("viewer CANNOT create (POST) in page-plugin", async () => {
        // Viewer can access the /new form (GET = read), but POST = create is forbidden
        const form = new URLSearchParams({
          slug: "viewer-attempt",
          title: "Should Fail",
          body: "",
          status: "draft",
          seo_title: "",
          seo_description: "",
          template: "",
          author_id: "",
          widgets_enabled: "false",
          _csrf: "dummy",
        });
        const res = await fetch(
          `${baseUrl}/admin/plugins/page-plugin`,
          {
            method: "POST",
            body: form,
            headers: { cookie: viewerCookie },
            redirect: "manual",
          },
        );
        // RBAC should block before CSRF check — expecting 403
        assertEquals(res.status, 403);
        await res.body?.cancel();
      });

      it("viewer CANNOT access user-plugin", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/user-plugin",
          viewerCookie,
        );
        assertEquals(res.status, 403);
        await res.body?.cancel();
      });

      it("viewer CAN read settings-plugin", async () => {
        const res = await fetchAuth(
          baseUrl,
          "/admin/plugins/settings-plugin",
          viewerCookie,
        );
        assertEquals(res.status, 200);
        await res.body?.cancel();
      });

      it("viewer CANNOT delete (POST delete) in page-plugin", async () => {
        // Find a page ID to try deleting
        const listRes = await fetchAuth(
          baseUrl,
          "/admin/plugins/page-plugin",
          cookie, // admin cookie to get page list
        );
        const listBody = await listRes.text();
        const pageMatch = listBody.match(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]+)/,
        );
        assert(pageMatch, "should find a page ID");
        const pageId = pageMatch[1];

        const res = await fetch(
          `${baseUrl}/admin/plugins/page-plugin/${pageId}/delete`,
          {
            method: "POST",
            body: new URLSearchParams({ _csrf: "dummy" }),
            headers: { cookie: viewerCookie },
            redirect: "manual",
          },
        );
        // viewer has no delete permission on pages
        assertEquals(res.status, 403);
        await res.body?.cancel();
      });
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Validation Edge Cases
    // ──────────────────────────────────────────────────────────────────────────
    describe("Validation Edge Cases", () => {
      it("POST create page with empty required fields should return 400", async () => {
        const csrfToken = await getCsrf(baseUrl, cookie, "page-plugin");
        const res = await createItem(
          baseUrl,
          cookie,
          "page-plugin",
          {
            slug: "",
            title: "",
            body: "",
            status: "",
            seo_title: "",
            seo_description: "",
            template: "",
            author_id: "",
            widgets_enabled: "false",
          },
          csrfToken,
        );
        assertEquals(res.status, 400);
        await res.body?.cancel();
      });

      it("POST create page with special characters in slug should return 400", async () => {
        const csrfToken = await getCsrf(baseUrl, cookie, "page-plugin");
        const res = await createItem(
          baseUrl,
          cookie,
          "page-plugin",
          {
            slug: "test page!@#$%",
            title: "Bad Slug Page",
            body: "content",
            status: "draft",
            seo_title: "",
            seo_description: "",
            template: "",
            author_id: "",
            widgets_enabled: "false",
          },
          csrfToken,
        );
        assertEquals(res.status, 400);
        await res.body?.cancel();
      });

      it("POST create category with special characters in slug should return 400", async () => {
        const csrfToken = await getCsrf(baseUrl, cookie, "category-plugin");
        const res = await createItem(
          baseUrl,
          cookie,
          "category-plugin",
          {
            name: "Bad Category",
            slug: "Bad Category!",
            description: "",
          },
          csrfToken,
        );
        assertEquals(res.status, 400);
        await res.body?.cancel();
      });

      it("POST create post with empty required fields should return 400", async () => {
        const csrfToken = await getCsrf(baseUrl, cookie, "post-plugin");
        const res = await createItem(
          baseUrl,
          cookie,
          "post-plugin",
          {
            slug: "",
            title: "",
            body: "",
            status: "",
            excerpt: "",
            seo_title: "",
            seo_description: "",
            author_id: "",
          },
          csrfToken,
        );
        assertEquals(res.status, 400);
        await res.body?.cancel();
      });

      it("POST create user with invalid email should return 400", async () => {
        const csrfToken = await getCsrf(baseUrl, cookie, "user-plugin");
        const res = await createItem(
          baseUrl,
          cookie,
          "user-plugin",
          {
            email: "not-an-email",
            display_name: "Test",
            role_id: "admin",
            status: "active",
          },
          csrfToken,
        );
        assertEquals(res.status, 400);
        await res.body?.cancel();
      });

      it("Widget columns nesting prevention should return 400 on create", async () => {
        assert(kv, "KV should be available");

        // Find a page with widgets_enabled
        const listRes = await fetchAuth(
          baseUrl,
          "/admin/plugins/page-plugin",
          cookie,
        );
        const listBody = await listRes.text();

        // We need a page with widgets_enabled — create one if needed
        const csrfToken = await getCsrf(baseUrl, cookie, "page-plugin");
        const createRes = await createItem(
          baseUrl,
          cookie,
          "page-plugin",
          {
            slug: "widget-test-page",
            title: "Widget Test Page",
            body: "Widget content",
            status: "draft",
            seo_title: "",
            seo_description: "",
            template: "",
            author_id: "",
            widgets_enabled: "true",
          },
          csrfToken,
        );
        assertEquals(createRes.status, 302);
        await createRes.body?.cancel();

        // Find the page ID
        const listRes2 = await fetchAuth(
          baseUrl,
          "/admin/plugins/page-plugin",
          cookie,
        );
        const listBody2 = await listRes2.text();
        const pageMatches = listBody2.match(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]+)/g,
        );
        assert(pageMatches, "should find page IDs");

        // Find the widget-test-page
        let widgetPageId = "";
        for (const match of pageMatches) {
          const id = match.replace("/admin/plugins/page-plugin/", "");
          const editRes = await fetchAuth(
            baseUrl,
            `/admin/plugins/page-plugin/${id}`,
            cookie,
          );
          const editBody = await editRes.text();
          if (editBody.includes('value="widget-test-page"')) {
            widgetPageId = id;
            break;
          }
        }
        assert(widgetPageId, "should find widget-test-page ID");

        // Get CSRF from builder page (rendered as <meta name="csrf-token" content="...">)
        const builderRes = await fetchAuth(
          baseUrl,
          `/admin/pages/${widgetPageId}/builder`,
          cookie,
        );
        const builderBody = await builderRes.text();
        const metaCsrfMatch = builderBody.match(
          /name="csrf-token"\s+content="([^"]+)"/,
        );
        const builderCsrf = metaCsrfMatch?.[1] ??
          extractCsrf(builderBody);
        assert(
          builderCsrf.length > 0,
          "CSRF token should be found in builder page",
        );

        // Try to create a columns widget inside a columns: placeholder
        // CSRF must go in X-CSRF-Token header for JSON requests
        const res = await fetch(
          `${baseUrl}/admin/pages/${widgetPageId}/widgets`,
          {
            method: "POST",
            headers: {
              cookie,
              "Content-Type": "application/json",
              "X-CSRF-Token": builderCsrf,
            },
            body: JSON.stringify({
              type: "columns",
              placeholder: "columns:abc:left",
              config: {},
            }),
          },
        );
        assertEquals(res.status, 400);
        const resBody = await res.json();
        assertStringIncludes(
          resBody.error,
          "columns widget cannot be nested",
        );
      });
    });
  },
);
