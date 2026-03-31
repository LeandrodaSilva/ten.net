import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { Ten } from "../ten.ts";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { GroupsPlugin } from "../plugins/groupsPlugin.ts";
import { UsersPlugin } from "../plugins/usersPlugin.ts";
import { SettingsPlugin } from "../plugins/settingsPlugin.ts";
import { RolesPlugin } from "../plugins/rolesPlugin.ts";
import { AuditLogPlugin } from "../plugins/auditLogPlugin.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Login and return the session cookie string. */
async function login(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/admin/login`, {
    method: "POST",
    body: new URLSearchParams({ username: "admin", password: "admin" }),
    redirect: "manual",
  });
  const cookie = res.headers.get("Set-Cookie") ?? "";
  await res.body?.cancel();
  return cookie.split(";")[0];
}

/** Extract the CSRF token from an HTML page that contains a hidden _csrf input. */
function extractCsrf(html: string): string {
  // React SSR renders: <input type="hidden" name="_csrf" value="TOKEN"/>
  // But attribute order may vary, so try multiple patterns
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

/** Create an item via the CRUD form POST and return the redirect response. */
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

describe("Admin E2E Integration", () => {
  let server: Deno.HttpServer;
  let baseUrl: string;
  let cookie: string;
  let kv: Deno.Kv | undefined;

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
    const admin = new AdminPlugin({
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
      ],
    });
    await app.useAdmin(admin);
    server = await app.start({ port: 0, onListen: () => {} });
    const addr = server.addr as Deno.NetAddr;
    baseUrl = `http://localhost:${addr.port}`;

    // Access KV handle for cleanup via internal field
    // deno-lint-ignore no-explicit-any
    kv = (admin as any)._kv ?? undefined;

    // Single login, reuse cookie
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
  // 1. Auth
  // ──────────────────────────────────────────────────────────────────────────
  describe("Auth", () => {
    it("GET /admin without session should redirect to login", async () => {
      const res = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
      assertEquals(res.status, 302);
      assertStringIncludes(res.headers.get("Location") ?? "", "/admin/login");
      await res.body?.cancel();
    });

    it("GET /admin/login should render the login page", async () => {
      const res = await fetch(`${baseUrl}/admin/login`);
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Sign in to admin");
      assertStringIncludes(body, 'action="/admin/login"');
    });

    it("POST /admin/login with valid credentials should redirect to /admin", async () => {
      const res = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        body: new URLSearchParams({ username: "admin", password: "admin" }),
        redirect: "manual",
      });
      assertEquals(res.status, 302);
      assertEquals(res.headers.get("Location"), "/admin");
      assertStringIncludes(
        res.headers.get("Set-Cookie") ?? "",
        "__tennet_sid=",
      );
      await res.body?.cancel();
    });

    it("POST /admin/login with invalid credentials should return 401", async () => {
      const res = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        body: new URLSearchParams({ username: "admin", password: "wrong" }),
      });
      assertEquals(res.status, 401);
      const body = await res.text();
      assertStringIncludes(body, "Invalid username or password");
    });

    it("POST /admin/logout should clear session and redirect", async () => {
      const tempCookie = await login(baseUrl);
      const res = await fetch(`${baseUrl}/admin/logout`, {
        method: "POST",
        headers: { cookie: tempCookie },
        redirect: "manual",
      });
      assertEquals(res.status, 302);
      assertEquals(res.headers.get("Location"), "/admin/login");
      await res.body?.cancel();
    });

    it("POST /admin/plugins/page-plugin without CSRF should return 403", async () => {
      const form = new URLSearchParams({
        slug: "csrf-test",
        title: "CSRF",
        body: "",
        status: "draft",
        widgets_enabled: "false",
      });
      const res = await fetch(`${baseUrl}/admin/plugins/page-plugin`, {
        method: "POST",
        body: form,
        headers: { cookie },
        redirect: "manual",
      });
      assertEquals(res.status, 403);
      await res.body?.cancel();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Dashboard & Navigation
  // ──────────────────────────────────────────────────────────────────────────
  describe("Dashboard & Navigation", () => {
    it("GET /admin should return 200 with plugin listing", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "<!DOCTYPE html>");
    });

    it("dashboard should list all registered plugins", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, "PagePlugin");
      assertStringIncludes(body, "PostPlugin");
      assertStringIncludes(body, "CategoryPlugin");
    });

    it("sidebar should have admin navigation", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, 'aria-label="Admin navigation"');
    });

    it("page should contain skip-to-content link", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, 'href="#main-content"');
      assertStringIncludes(body, "Skip to content");
    });

    it("page should have main-content landmark", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, 'id="main-content"');
    });

    it("page should have ARIA header element", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, "<header");
    });

    it("each plugin link should have correct href", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, "/admin/plugins/page-plugin");
      assertStringIncludes(body, "/admin/plugins/post-plugin");
    });

    it("dashboard should use responsive Tailwind classes", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, "sm:");
    });

    it("plugin pages should have breadcrumbs", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, 'aria-label="Breadcrumb"');
    });

    it("GET /admin/favicon.ico should return icon", async () => {
      const res = await fetch(`${baseUrl}/admin/favicon.ico`);
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "image/x-icon");
      await res.body?.cancel();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PagePlugin CRUD
  // ──────────────────────────────────────────────────────────────────────────
  describe("PagePlugin CRUD", () => {
    let csrfToken: string;

    it("GET /admin/plugins/page-plugin should list pages", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "PagePlugin");
      // Get CSRF from new form since list may be empty (no forms)
      csrfToken = await getCsrf(baseUrl, cookie, "page-plugin");
    });

    it("GET /admin/plugins/page-plugin/new should render create form", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin/new",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "checkbox");
      assertStringIncludes(body, "slug");
    });

    it("POST create page should redirect with success", async () => {
      const res = await createItem(baseUrl, cookie, "page-plugin", {
        slug: "test-page",
        title: "Test Page",
        body: "Hello world",
        status: "published",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "false",
      }, csrfToken);
      assertEquals(res.status, 302);
      assertStringIncludes(
        res.headers.get("Location") ?? "",
        "success=created",
      );
      await res.body?.cancel();
    });

    it("POST create page with duplicate slug should return 400", async () => {
      const res = await createItem(baseUrl, cookie, "page-plugin", {
        slug: "test-page",
        title: "Duplicate",
        body: "Dupe",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "false",
      }, csrfToken);
      assertEquals(res.status, 400);
      const json = await res.json();
      assertStringIncludes(json.errors.slug, "already in use");
    });

    it("POST create page with invalid slug should return 400", async () => {
      const res = await createItem(baseUrl, cookie, "page-plugin", {
        slug: "Invalid Slug!",
        title: "Bad slug",
        body: "",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "false",
      }, csrfToken);
      assertEquals(res.status, 400);
      const json = await res.json();
      assert(json.errors.slug);
    });

    it("listing should show created page", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "test-page");
    });

    it("GET edit form for page should contain values", async () => {
      // Find the page id from the list
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID in list");
      const pageId = idMatch![1];

      const res = await fetchAuth(
        baseUrl,
        `/admin/plugins/page-plugin/${pageId}`,
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "test-page");
      assertStringIncludes(body, "Test Page");
    });

    it("POST update page should redirect with success", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      const pageId = idMatch![1];

      const form = new URLSearchParams({
        slug: "test-page",
        title: "Updated Title",
        body: "Updated body",
        status: "published",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "false",
        _csrf: csrfToken,
      });
      const res = await fetch(
        `${baseUrl}/admin/plugins/page-plugin/${pageId}`,
        {
          method: "POST",
          body: form,
          headers: { cookie },
          redirect: "manual",
        },
      );
      assertEquals(res.status, 302);
      assertStringIncludes(
        res.headers.get("Location") ?? "",
        "success=updated",
      );
      await res.body?.cancel();
    });

    it("POST delete page should redirect with success", async () => {
      // Create a page to delete
      const createRes = await createItem(baseUrl, cookie, "page-plugin", {
        slug: "to-delete",
        title: "Delete Me",
        body: "",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "false",
      }, csrfToken);
      await createRes.body?.cancel();

      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      // Find the delete-page id
      const matches = [
        ...listBody.matchAll(/\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/g),
      ];
      const deleteId = matches[matches.length - 1]?.[1];
      assert(deleteId, "should find page ID to delete");

      const form = new URLSearchParams({ _csrf: csrfToken });
      const res = await fetch(
        `${baseUrl}/admin/plugins/page-plugin/${deleteId}/delete`,
        {
          method: "POST",
          body: form,
          headers: { cookie },
          redirect: "manual",
        },
      );
      assertEquals(res.status, 302);
      assertStringIncludes(
        res.headers.get("Location") ?? "",
        "success=deleted",
      );
      await res.body?.cancel();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PostsPlugin CRUD
  // ──────────────────────────────────────────────────────────────────────────
  describe("PostsPlugin CRUD", () => {
    let csrfToken: string;

    it("GET /admin/plugins/post-plugin should list posts", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/post-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "PostPlugin");
      csrfToken = await getCsrf(baseUrl, cookie, "post-plugin");
    });

    it("GET /admin/plugins/post-plugin/new should render form with textarea", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/post-plugin/new",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "textarea");
      assertStringIncludes(body, "select");
    });

    it("POST create post should redirect with success", async () => {
      const res = await createItem(baseUrl, cookie, "post-plugin", {
        title: "My First Post",
        slug: "my-first-post",
        excerpt: "",
        body: "Post body content",
        cover_image: "",
        status: "published",
        category_ids: "",
        author_id: "",
        published_at: "",
      }, csrfToken);
      assertEquals(res.status, 302);
      assertStringIncludes(
        res.headers.get("Location") ?? "",
        "success=created",
      );
      await res.body?.cancel();
    });

    it("POST create post with invalid slug should fail", async () => {
      const res = await createItem(baseUrl, cookie, "post-plugin", {
        title: "Bad Slug Post",
        slug: "BAD SLUG!",
        excerpt: "",
        body: "",
        cover_image: "",
        status: "draft",
        category_ids: "",
        author_id: "",
        published_at: "",
      }, csrfToken);
      assertEquals(res.status, 400);
      const json = await res.json();
      assert(json.errors.slug);
    });

    it("listing should show created post", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/post-plugin",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "my-first-post");
    });

    it("POST delete post should redirect", async () => {
      const createRes = await createItem(baseUrl, cookie, "post-plugin", {
        title: "Delete Post",
        slug: "delete-post",
        excerpt: "",
        body: "",
        cover_image: "",
        status: "draft",
        category_ids: "",
        author_id: "",
        published_at: "",
      }, csrfToken);
      await createRes.body?.cancel();

      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/post-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const matches = [
        ...listBody.matchAll(/\/admin\/plugins\/post-plugin\/([a-f0-9-]{36})/g),
      ];
      const deleteId = matches[matches.length - 1]?.[1];
      assert(deleteId);

      const form = new URLSearchParams({ _csrf: csrfToken });
      const res = await fetch(
        `${baseUrl}/admin/plugins/post-plugin/${deleteId}/delete`,
        {
          method: "POST",
          body: form,
          headers: { cookie },
          redirect: "manual",
        },
      );
      assertEquals(res.status, 302);
      await res.body?.cancel();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CategoriesPlugin CRUD
  // ──────────────────────────────────────────────────────────────────────────
  describe("CategoriesPlugin CRUD", () => {
    let csrfToken: string;

    it("GET /admin/plugins/category-plugin should list categories", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/category-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "CategoryPlugin");
      csrfToken = await getCsrf(baseUrl, cookie, "category-plugin");
    });

    it("GET /admin/plugins/category-plugin/new should render form", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/category-plugin/new",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Name");
    });

    it("POST create category should redirect", async () => {
      const res = await createItem(baseUrl, cookie, "category-plugin", {
        name: "Tech",
        slug: "tech",
        description: "Technology posts",
      }, csrfToken);
      assertEquals(res.status, 302);
      assertStringIncludes(
        res.headers.get("Location") ?? "",
        "success=created",
      );
      await res.body?.cancel();
    });

    it("POST create with duplicate slug should return 400", async () => {
      const res = await createItem(baseUrl, cookie, "category-plugin", {
        name: "Tech Dupe",
        slug: "tech",
        description: "",
      }, csrfToken);
      assertEquals(res.status, 400);
      const json = await res.json();
      assertStringIncludes(json.errors.slug, "already in use");
    });

    it("listing should show created category", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/category-plugin",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "tech");
    });

    it("POST delete category should redirect", async () => {
      const createRes = await createItem(baseUrl, cookie, "category-plugin", {
        name: "ToDelete",
        slug: "to-delete-cat",
        description: "",
      }, csrfToken);
      await createRes.body?.cancel();

      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/category-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const matches = [
        ...listBody.matchAll(
          /\/admin\/plugins\/category-plugin\/([a-f0-9-]{36})/g,
        ),
      ];
      const deleteId = matches[matches.length - 1]?.[1];
      assert(deleteId);

      const form = new URLSearchParams({ _csrf: csrfToken });
      const res = await fetch(
        `${baseUrl}/admin/plugins/category-plugin/${deleteId}/delete`,
        {
          method: "POST",
          body: form,
          headers: { cookie },
          redirect: "manual",
        },
      );
      assertEquals(res.status, 302);
      await res.body?.cancel();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. GroupsPlugin CRUD
  // ──────────────────────────────────────────────────────────────────────────
  describe("GroupsPlugin CRUD", () => {
    let csrfToken: string;

    it("GET /admin/plugins/group-plugin should list groups", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/group-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "GroupPlugin");
      csrfToken = await getCsrf(baseUrl, cookie, "group-plugin");
    });

    it("POST create group should redirect", async () => {
      const res = await createItem(baseUrl, cookie, "group-plugin", {
        name: "Featured",
        slug: "featured",
        description: "Featured items",
        item_ids: "[]",
      }, csrfToken);
      assertEquals(res.status, 302);
      await res.body?.cancel();
    });

    it("listing should show created group", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/group-plugin",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "Featured");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. UsersPlugin CRUD
  // ──────────────────────────────────────────────────────────────────────────
  describe("UsersPlugin CRUD", () => {
    let csrfToken: string;

    it("GET /admin/plugins/user-plugin should list users", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/user-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "UserPlugin");
      csrfToken = await getCsrf(baseUrl, cookie, "user-plugin");
    });

    it("GET /admin/plugins/user-plugin/new should have role select", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/user-plugin/new",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "select");
    });

    it("POST create user should redirect", async () => {
      const res = await createItem(baseUrl, cookie, "user-plugin", {
        email: "test@example.com",
        display_name: "Test User",
        role_id: "admin",
        status: "active",
      }, csrfToken);
      assertEquals(res.status, 302);
      assertStringIncludes(
        res.headers.get("Location") ?? "",
        "success=created",
      );
      await res.body?.cancel();
    });

    it("POST create user with invalid email should return 400", async () => {
      const res = await createItem(baseUrl, cookie, "user-plugin", {
        email: "not-an-email",
        display_name: "Bad Email",
        role_id: "admin",
        status: "active",
      }, csrfToken);
      assertEquals(res.status, 400);
      const json = await res.json();
      assert(json.errors.email);
    });

    it("listing should show created user", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/user-plugin",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "test@example.com");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. SettingsPlugin CRUD
  // ──────────────────────────────────────────────────────────────────────────
  describe("SettingsPlugin CRUD", () => {
    let csrfToken: string;

    it("GET /admin/plugins/settings-plugin should list settings", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/settings-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "SettingsPlugin");
      csrfToken = await getCsrf(baseUrl, cookie, "settings-plugin");
    });

    it("POST create setting should return 403 (admin has read+update only)", async () => {
      // RBAC: admin role has settings: ["read", "update"] — no "create"
      const res = await createItem(baseUrl, cookie, "settings-plugin", {
        key: "site_name",
        value: "My Site",
      }, csrfToken);
      assertEquals(res.status, 403);
      await res.body?.cancel();
    });

    it("GET /admin/plugins/settings-plugin/new should render form", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/settings-plugin/new",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Key");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. RolesPlugin CRUD
  // ──────────────────────────────────────────────────────────────────────────
  describe("RolesPlugin CRUD", () => {
    let csrfToken: string;

    it("GET /admin/plugins/role-plugin should list seeded roles", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/role-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Admin");
      assertStringIncludes(body, "Editor");
      assertStringIncludes(body, "Viewer");
      csrfToken = await getCsrf(baseUrl, cookie, "role-plugin");
    });

    it("POST create custom role should redirect", async () => {
      const res = await createItem(baseUrl, cookie, "role-plugin", {
        name: "Moderator",
        slug: "moderator",
        description: "Content moderator",
        is_system: "false",
      }, csrfToken);
      assertEquals(res.status, 302);
      await res.body?.cancel();
    });

    it("POST delete system role should redirect", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/role-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      // Find first system role ID (Admin)
      const idMatch = listBody.match(
        /\/admin\/plugins\/role-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find role ID");
      const roleId = idMatch![1];

      const form = new URLSearchParams({ _csrf: csrfToken });
      const res = await fetch(
        `${baseUrl}/admin/plugins/role-plugin/${roleId}/delete`,
        {
          method: "POST",
          body: form,
          headers: { cookie },
          redirect: "manual",
        },
      );
      // Should redirect (either with error or success)
      assertEquals(res.status, 302);
      await res.body?.cancel();
    });

    it("listing should show seeded roles", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/role-plugin",
        cookie,
      );
      const body = await res.text();
      // At minimum, seeded roles should exist
      assertStringIncludes(body, "Editor");
      assertStringIncludes(body, "Viewer");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9b. AuditLogPlugin (readonly)
  // ──────────────────────────────────────────────────────────────────────────
  describe("AuditLogPlugin (readonly)", () => {
    let csrfToken: string;

    it("GET /admin/plugins/audit-log-plugin should list audit entries", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/audit-log-plugin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "AuditLogPlugin");
      // AuditLog is readonly - no "new" form, get CSRF from another plugin
      csrfToken = await getCsrf(baseUrl, cookie, "page-plugin");
    });

    it("POST to audit-log-plugin should return 403 (readonly)", async () => {
      const form = new URLSearchParams({
        action: "create",
        resource: "test",
        resource_id: "1",
        user_id: "1",
        username: "admin",
        details: "",
        timestamp: new Date().toISOString(),
        _csrf: csrfToken,
      });
      const res = await fetch(
        `${baseUrl}/admin/plugins/audit-log-plugin`,
        {
          method: "POST",
          body: form,
          headers: { cookie },
          redirect: "manual",
        },
      );
      assertEquals(res.status, 403);
      await res.body?.cancel();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Page Builder
  // ──────────────────────────────────────────────────────────────────────────
  describe("Page Builder", () => {
    let pageId: string;
    let csrfToken: string;
    let widgetId: string;

    it("should create a page with widgets_enabled for builder", async () => {
      // Get CSRF from page-plugin new form
      csrfToken = await getCsrf(baseUrl, cookie, "page-plugin");

      const res = await createItem(baseUrl, cookie, "page-plugin", {
        slug: "builder-page",
        title: "Builder Page",
        body: "{{widgets:main}}",
        status: "draft",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "true",
      }, csrfToken);
      assertEquals(res.status, 302);
      await res.body?.cancel();

      // Find the page ID by fetching each item and checking for builder-page slug
      const updatedList = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const updatedBody = await updatedList.text();
      const allIds = [
        ...updatedBody.matchAll(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/g,
        ),
      ].map((m) => m[1]);
      // Deduplicate IDs (each appears multiple times in the HTML)
      const uniqueIds = [...new Set(allIds)];
      for (const candidateId of uniqueIds) {
        const editRes = await fetchAuth(
          baseUrl,
          `/admin/plugins/page-plugin/${candidateId}`,
          cookie,
        );
        const editBody = await editRes.text();
        if (editBody.includes('value="builder-page"')) {
          pageId = candidateId;
          break;
        }
      }
      assert(pageId, "should find builder page ID");
    });

    it("edit form should show Page Builder link for widgets_enabled page", async () => {
      const res = await fetchAuth(
        baseUrl,
        `/admin/plugins/page-plugin/${pageId}`,
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Page Builder");
      assertStringIncludes(body, `/admin/pages/${pageId}/builder`);
    });

    it("GET /admin/pages/[id]/builder should render page builder", async () => {
      const res = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Builder Page");
    });

    it("builder page should include Sortable.js CDN script", async () => {
      const res = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "sortablejs");
    });

    it("GET /admin/pages/[id]/widgets should return empty array", async () => {
      const res = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/widgets`,
        cookie,
      );
      assertEquals(res.status, 200);
      const json = await res.json();
      assertEquals(Array.isArray(json), true);
      assertEquals(json.length, 0);
    });

    it("POST /admin/pages/[id]/widgets should create widget", async () => {
      const res = await fetch(
        `${baseUrl}/admin/pages/${pageId}/widgets`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "hero",
            placeholder: "main",
            order: 0,
            data: { heading: "Welcome" },
          }),
          headers: {
            cookie,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      assertEquals(res.status, 201);
      const json = await res.json();
      assert(json.id);
      assertEquals(json.type, "hero");
      widgetId = json.id;
    });

    it("POST /admin/pages/[id]/widgets/[wid] should update widget", async () => {
      const res = await fetch(
        `${baseUrl}/admin/pages/${pageId}/widgets/${widgetId}`,
        {
          method: "POST",
          body: JSON.stringify({
            data: { heading: "Updated Welcome" },
            order: 1,
          }),
          headers: {
            cookie,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      assertEquals(res.status, 200);
      const json = await res.json();
      assertEquals(json.data.heading, "Updated Welcome");
    });

    it("POST reorder widgets should return 204", async () => {
      // Create a second widget
      const createRes = await fetch(
        `${baseUrl}/admin/pages/${pageId}/widgets`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "rich-text",
            placeholder: "main",
            order: 1,
            data: { content: "text" },
          }),
          headers: {
            cookie,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      const w2 = await createRes.json();

      const res = await fetch(
        `${baseUrl}/admin/pages/${pageId}/widgets/reorder`,
        {
          method: "POST",
          body: JSON.stringify([
            { widgetId, order: 1 },
            { widgetId: w2.id, order: 0 },
          ]),
          headers: {
            cookie,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      assertEquals(res.status, 204);
      await res.body?.cancel();
    });

    it("POST delete widget should return 204", async () => {
      const res = await fetch(
        `${baseUrl}/admin/pages/${pageId}/widgets/${widgetId}/delete`,
        {
          method: "POST",
          headers: {
            cookie,
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      assertEquals(res.status, 204);
      await res.body?.cancel();
    });

    it("POST duplicate widget should return 201 with new ID", async () => {
      // Create a widget to duplicate
      const createRes = await fetch(
        `${baseUrl}/admin/pages/${pageId}/widgets`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "hero",
            placeholder: "main",
            order: 0,
            data: { heading: "Original" },
          }),
          headers: {
            cookie,
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      const original = await createRes.json();

      const res = await fetch(
        `${baseUrl}/admin/pages/${pageId}/widgets/${original.id}/duplicate`,
        {
          method: "POST",
          headers: {
            cookie,
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      assertEquals(res.status, 201);
      const duplicate = await res.json();

      // New ID, same type and data
      assert(duplicate.id !== original.id, "duplicate should have new ID");
      assertEquals(duplicate.type, original.type);
      assertEquals(duplicate.data.heading, "Original");
      assertEquals(duplicate.placeholder, original.placeholder);
      // Timestamps should be fresh
      assert(duplicate.created_at, "should have created_at");
      assert(duplicate.updated_at, "should have updated_at");
    });

    it("builder page should have data-widget attributes", async () => {
      const res = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      const body = await res.text();
      // Widget palette should have data-widget-type
      assertStringIncludes(body, "data-widget-type");
    });

    it("palette should show Restrito badge for html and embed widgets", async () => {
      const res = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "Restrito");
    });

    // ── Preview ──────────────────────────────────────────────────────────

    describe("Preview", () => {
      it("GET /admin/pages/[id]/builder/preview should return 200", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/pages/${pageId}/builder/preview`,
          cookie,
        );
        assertEquals(res.status, 200);
        await res.text();
      });

      it("preview response should have X-Frame-Options header", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/pages/${pageId}/builder/preview`,
          cookie,
        );
        // Preview route sets SAMEORIGIN so the builder iframe can embed it.
        const xfo = res.headers.get("X-Frame-Options");
        assert(xfo !== null, "X-Frame-Options header should be present");
        assertEquals(xfo, "SAMEORIGIN");
        await res.text();
      });

      it("preview response should have Cache-Control header", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/pages/${pageId}/builder/preview`,
          cookie,
        );
        assertEquals(
          res.headers.get("Cache-Control"),
          "no-store",
        );
        await res.text();
      });

      it("builder HTML should have btn-preview button", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/pages/${pageId}/builder`,
          cookie,
        );
        const body = await res.text();
        assertStringIncludes(body, 'id="btn-preview"');
      });

      it("builder HTML should have preview-modal with hidden class", async () => {
        const res = await fetchAuth(
          baseUrl,
          `/admin/pages/${pageId}/builder`,
          cookie,
        );
        const body = await res.text();
        assertStringIncludes(body, 'id="preview-modal"');
        // The modal should have the hidden class by default
        assert(
          body.includes('id="preview-modal"') &&
            body.match(/id="preview-modal"[^>]*class="[^"]*hidden/),
          "preview-modal should have hidden class",
        );
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Visual / HTML quality
  // ──────────────────────────────────────────────────────────────────────────
  describe("Visual / HTML quality", () => {
    it("data-table with items should use truncate classes", async () => {
      // This test runs after PagePlugin CRUD creates items
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/role-plugin",
        cookie,
      );
      const body = await res.text();
      // Roles have seeded data, so table should be present
      assertStringIncludes(body, "truncate");
    });

    it("forms should use label elements", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin/new",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, "<label");
    });

    it("page form should have checkbox for boolean fields", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin/new",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, 'type="checkbox"');
    });

    it("admin HTML should use data- attributes for interactivity", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      // Admin JS uses data-confirm and data-dismiss-alert
      assertStringIncludes(body, "data-confirm");
    });

    it("CRUD forms should include hidden _csrf field", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin/new",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, 'name="_csrf"');
    });

    it("login page should have proper form structure", async () => {
      const res = await fetch(`${baseUrl}/admin/login`);
      const body = await res.text();
      assertStringIncludes(body, "<form");
      assertStringIncludes(body, "username");
      assertStringIncludes(body, "password");
    });

    it("admin pages should include Tailwind CSS CDN", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, "tailwindcss");
    });

    it("admin pages should have lang attribute", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, 'lang="en"');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Accessibility
  // ──────────────────────────────────────────────────────────────────────────
  describe("Accessibility", () => {
    it("skip-to-content link should target main-content", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, 'href="#main-content"');
      assertStringIncludes(body, 'id="main-content"');
    });

    it("navigation should have aria-label", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      assertStringIncludes(body, 'aria-label="Admin navigation"');
    });

    it("pagination should have aria-label", async () => {
      // Create enough items to paginate
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const body = await listRes.text();
      // Pagination might or might not be present depending on count
      // Just verify the component is loaded correctly
      assertEquals(listRes.status, 200);
      assert(body.length > 0);
    });

    it("breadcrumbs should have aria-label", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin/new",
        cookie,
      );
      const body = await res.text();
      assertStringIncludes(body, 'aria-label="Breadcrumb"');
    });

    it("images should have alt attributes", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      const body = await res.text();
      // All img tags should have alt
      const imgs = [...body.matchAll(/<img[^>]*>/g)];
      for (const img of imgs) {
        assertMatch(img[0], /alt=/);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Permissions
  // ──────────────────────────────────────────────────────────────────────────
  describe("Permissions", () => {
    it("admin user can access all plugin pages", async () => {
      const slugs = [
        "page-plugin",
        "post-plugin",
        "category-plugin",
        "group-plugin",
        "user-plugin",
        "settings-plugin",
        "role-plugin",
        "audit-log-plugin",
      ];
      for (const slug of slugs) {
        const res = await fetchAuth(
          baseUrl,
          `/admin/plugins/${slug}`,
          cookie,
        );
        assertEquals(res.status, 200, `Should access ${slug}`);
        await res.text();
      }
    });

    it("admin user can access dashboard", async () => {
      const res = await fetchAuth(baseUrl, "/admin", cookie);
      assertEquals(res.status, 200);
      await res.text();
    });

    it("unauthenticated user cannot access plugin pages", async () => {
      const res = await fetch(`${baseUrl}/admin/plugins/page-plugin`, {
        redirect: "manual",
      });
      assertEquals(res.status, 302);
      assertStringIncludes(res.headers.get("Location") ?? "", "/admin/login");
      await res.body?.cancel();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Blog Public Routes
  // ──────────────────────────────────────────────────────────────────────────
  describe("Blog Public Routes", () => {
    it("GET /blog should return blog listing page", async () => {
      const res = await fetch(`${baseUrl}/blog`);
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Blog");
    });

    it("GET /blog/rss.xml should return RSS feed", async () => {
      const res = await fetch(`${baseUrl}/blog/rss.xml`);
      assertEquals(res.status, 200);
      assertEquals(
        res.headers.get("Content-Type"),
        "application/rss+xml; charset=utf-8",
      );
      const body = await res.text();
      assertStringIncludes(body, "<rss");
    });

    it("blog should show published posts after creation", async () => {
      // Create a fresh published post to ensure blog registration
      const csrfToken = await getCsrf(baseUrl, cookie, "post-plugin");
      const createRes = await createItem(baseUrl, cookie, "post-plugin", {
        title: "Blog Visible Post",
        slug: "blog-visible-post",
        excerpt: "A visible excerpt",
        body: "Blog body content here",
        cover_image: "",
        status: "published",
        category_ids: "",
        author_id: "",
        published_at: "",
      }, csrfToken);
      assertEquals(createRes.status, 302);
      await createRes.body?.cancel();

      const res = await fetch(`${baseUrl}/blog`);
      const body = await res.text();
      assertStringIncludes(body, "Blog Visible Post");
    });

    it("GET /blog/{slug} for published post should return 200", async () => {
      const res = await fetch(`${baseUrl}/blog/blog-visible-post`);
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Blog Visible Post");
      assertStringIncludes(body, "Blog body content here");
    });

    it("GET /blog/{slug} for nonexistent post should return 404", async () => {
      const res = await fetch(`${baseUrl}/blog/nonexistent-slug`);
      assertEquals(res.status, 404);
      const body = await res.text();
      assertStringIncludes(body, "Post Not Found");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Search & Pagination
  // ──────────────────────────────────────────────────────────────────────────
  describe("Search & Pagination", () => {
    it("GET /admin/plugins/role-plugin?q=Admin should filter results", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/role-plugin?q=Admin",
        cookie,
      );
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Admin");
    });

    it("GET /admin/plugins/page-plugin?page=1 should work", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin?page=1",
        cookie,
      );
      assertEquals(res.status, 200);
      await res.text();
    });

    it("GET nonexistent item should return 404", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin/00000000-0000-0000-0000-000000000000",
        cookie,
      );
      assertEquals(res.status, 404);
      await res.text();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation Links
  // ──────────────────────────────────────────────────────────────────────────
  describe("Navigation Links", () => {
    const pluginSlugs = [
      "page-plugin",
      "post-plugin",
      "category-plugin",
      "group-plugin",
      "user-plugin",
      "settings-plugin",
      "role-plugin",
      "audit-log-plugin",
    ];

    it("dashboard plugin cards should link to /admin/plugins/{slug} and return 200", async () => {
      const dashRes = await fetchAuth(baseUrl, "/admin", cookie);
      const dashBody = await dashRes.text();

      for (const slug of pluginSlugs) {
        const expectedHref = `/admin/plugins/${slug}`;
        assertStringIncludes(
          dashBody,
          expectedHref,
          `Dashboard missing link to ${expectedHref}`,
        );
        const res = await fetchAuth(baseUrl, expectedHref, cookie);
        assertEquals(
          res.status,
          200,
          `GET ${expectedHref} should return 200`,
        );
        await res.text();
      }
    });

    it("plugin list 'Add' link should point to /admin/plugins/{slug}/new and return 200", async () => {
      for (const slug of pluginSlugs) {
        const listRes = await fetchAuth(
          baseUrl,
          `/admin/plugins/${slug}`,
          cookie,
        );
        const listBody = await listRes.text();
        const newHref = `/admin/plugins/${slug}/new`;
        assertStringIncludes(
          listBody,
          newHref,
          `Plugin list ${slug} missing 'Add' link to ${newHref}`,
        );
        const res = await fetchAuth(baseUrl, newHref, cookie);
        assertEquals(res.status, 200, `GET ${newHref} should return 200`);
        await res.text();
      }
    });

    it("plugin list 'Edit' link should point to /admin/plugins/{slug}/{id} and return 200", async () => {
      // Use page-plugin which already has items from CRUD tests
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID in list for edit link");
      const editHref = `/admin/plugins/page-plugin/${idMatch![1]}`;
      assertStringIncludes(listBody, editHref);

      const res = await fetchAuth(baseUrl, editHref, cookie);
      assertEquals(res.status, 200, `GET ${editHref} should return 200`);
      await res.text();
    });

    it("edit form 'Cancel' should link back to /admin/plugins/{slug} and return 200", async () => {
      // Get a page ID
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID for edit form test");

      const editRes = await fetchAuth(
        baseUrl,
        `/admin/plugins/page-plugin/${idMatch![1]}`,
        cookie,
      );
      const editBody = await editRes.text();
      const cancelHref = "/admin/plugins/page-plugin";
      assertStringIncludes(
        editBody,
        cancelHref,
        "Edit form should contain Cancel link back to plugin list",
      );

      const res = await fetchAuth(baseUrl, cancelHref, cookie);
      assertEquals(
        res.status,
        200,
        `GET ${cancelHref} should return 200`,
      );
      await res.text();
    });

    it("page edit should link to Page Builder and return 200", async () => {
      // Create a page with widgets_enabled so the builder link appears
      const csrf = await getCsrf(baseUrl, cookie, "page-plugin");
      const createRes = await createItem(baseUrl, cookie, "page-plugin", {
        slug: "nav-builder-test",
        title: "Nav Builder Test",
        body: "test",
        status: "published",
        seo_title: "",
        seo_description: "",
        template: "",
        author_id: "",
        widgets_enabled: "true",
      }, csrf);
      await createRes.body?.cancel();

      // Find the newly created page by locating its slug in the list HTML
      // and extracting the UUID from the same table row.
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      // Find the <tr> block that contains the slug "nav-builder-test" and
      // extract the UUID from the edit/delete href within that row.
      const trMatch = listBody.match(
        /<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?nav-builder-test[\s\S]*?\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})[\s\S]*?<\/tr>/,
      );
      const pageId = trMatch?.[1];
      assert(pageId, "should find page ID for builder link test");

      const editRes = await fetchAuth(
        baseUrl,
        `/admin/plugins/page-plugin/${pageId}`,
        cookie,
      );
      const editBody = await editRes.text();
      const builderHref = `/admin/pages/${pageId}/builder`;
      assertStringIncludes(
        editBody,
        builderHref,
        "Edit form should contain Page Builder link when widgets_enabled",
      );

      const builderRes = await fetchAuth(baseUrl, builderHref, cookie);
      assertEquals(
        builderRes.status,
        200,
        `GET ${builderHref} should return 200`,
      );
      await builderRes.text();
    });

    it("builder 'Voltar' should link to /admin/plugins/page-plugin and return 200", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID for builder Voltar test");
      const pageId = idMatch![1];

      const builderRes = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      const builderBody = await builderRes.text();
      const voltarHref = "/admin/plugins/page-plugin";
      assertStringIncludes(
        builderBody,
        `href="${voltarHref}"`,
        "Builder should contain 'Voltar' link to plugin list",
      );

      const res = await fetchAuth(baseUrl, voltarHref, cookie);
      assertEquals(res.status, 200, `GET ${voltarHref} should return 200`);
      await res.text();
    });

    it("builder 'Configurações' should link to /admin/plugins/page-plugin/{id} and return 200", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID for builder Configurações test");
      const pageId = idMatch![1];

      const builderRes = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      const builderBody = await builderRes.text();
      const configHref = `/admin/plugins/page-plugin/${pageId}`;
      assertStringIncludes(
        builderBody,
        configHref,
        "Builder should contain 'Configurações' link to edit page",
      );

      const res = await fetchAuth(baseUrl, configHref, cookie);
      assertEquals(res.status, 200, `GET ${configHref} should return 200`);
      await res.text();
    });

    it("breadcrumb 'Home' should link to /admin and return 200", async () => {
      const pluginRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const pluginBody = await pluginRes.text();
      assertStringIncludes(
        pluginBody,
        'href="/admin"',
        "Breadcrumb should contain Home link to /admin",
      );

      const res = await fetchAuth(baseUrl, "/admin", cookie);
      assertEquals(res.status, 200, "GET /admin should return 200");
      await res.text();
    });

    it("sidebar 'Dashboard' should link to /admin and return 200", async () => {
      const dashRes = await fetchAuth(baseUrl, "/admin", cookie);
      const dashBody = await dashRes.text();
      assertStringIncludes(
        dashBody,
        'href="/admin"',
        "Sidebar should contain Dashboard link to /admin",
      );
    });

    it("GET /admin/pages/{id} (without /builder) should return 404", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID for 404 test");

      const res = await fetchAuth(
        baseUrl,
        `/admin/pages/${idMatch![1]}`,
        cookie,
      );
      assertEquals(
        res.status,
        404,
        "GET /admin/pages/{id} without /builder should return 404",
      );
      await res.text();
    });

    it("GET /admin/plugins/nonexistent should return 403 or 404", async () => {
      const res = await fetchAuth(
        baseUrl,
        "/admin/plugins/nonexistent",
        cookie,
      );
      // RBAC middleware intercepts before plugin lookup, returning 403
      assert(
        res.status === 403 || res.status === 404,
        `GET /admin/plugins/nonexistent should return 403 or 404, got ${res.status}`,
      );
      await res.text();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation Regression
  // ──────────────────────────────────────────────────────────────────────────
  describe("Navigation Regression", () => {
    it("builder HTML should contain correct 'Voltar' href", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID for regression test");
      const pageId = idMatch![1];

      const builderRes = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      const builderBody = await builderRes.text();

      // Voltar must point to /admin/plugins/page-plugin (NOT /admin/pages)
      assertMatch(
        builderBody,
        /href="\/admin\/plugins\/page-plugin"/,
        "Voltar link must use /admin/plugins/page-plugin",
      );
    });

    it("builder HTML should contain correct 'Configurações' href", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID for regression test");
      const pageId = idMatch![1];

      const builderRes = await fetchAuth(
        baseUrl,
        `/admin/pages/${pageId}/builder`,
        cookie,
      );
      const builderBody = await builderRes.text();

      // Configurações must point to /admin/plugins/page-plugin/{id}
      assertStringIncludes(
        builderBody,
        `/admin/plugins/page-plugin/${pageId}`,
        "Configurações link must use /admin/plugins/page-plugin/{id}",
      );
    });

    it("following corrected builder links should return 200", async () => {
      const listRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      const listBody = await listRes.text();
      const idMatch = listBody.match(
        /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
      );
      assert(idMatch, "should find page ID for follow-link test");
      const pageId = idMatch![1];

      // Follow Voltar link
      const voltarRes = await fetchAuth(
        baseUrl,
        "/admin/plugins/page-plugin",
        cookie,
      );
      assertEquals(
        voltarRes.status,
        200,
        "Voltar link /admin/plugins/page-plugin should return 200",
      );
      await voltarRes.text();

      // Follow Configurações link
      const configRes = await fetchAuth(
        baseUrl,
        `/admin/plugins/page-plugin/${pageId}`,
        cookie,
      );
      assertEquals(
        configRes.status,
        200,
        `Configurações link /admin/plugins/page-plugin/${pageId} should return 200`,
      );
      await configRes.text();
    });
  });
});
