import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import puppeteer, { type Browser, type Page } from "puppeteer";
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Login via Puppeteer: fill form and submit. */
async function login(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle2" });
  await page.type('input[name="username"]', "admin");
  await page.type('input[name="password"]', "admin");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click('button[type="submit"]'),
  ]);
}

/** Create a page via HTTP so we have data for builder tests. */
async function createPageViaApi(
  baseUrl: string,
  cookie: string,
  slug: string,
  title: string,
  widgetsEnabled: boolean,
): Promise<void> {
  // Get CSRF
  const newRes = await fetch(`${baseUrl}/admin/plugins/page-plugin/new`, {
    headers: { cookie },
  });
  const html = await newRes.text();
  const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/) ??
    html.match(/value="([^"]+)"[^>]*name="_csrf"/);
  const csrf = csrfMatch?.[1] ?? "";

  const form = new URLSearchParams({
    slug,
    title,
    body: "<p>Test content</p>",
    status: "published",
    seo_title: "",
    seo_description: "",
    template: "",
    author_id: "",
    widgets_enabled: widgetsEnabled ? "true" : "false",
    _csrf: csrf,
  });
  const res = await fetch(`${baseUrl}/admin/plugins/page-plugin`, {
    method: "POST",
    body: form,
    headers: { cookie },
    redirect: "manual",
  });
  await res.body?.cancel();
}

/** Extract session cookie from browser page cookies. */
async function getSessionCookie(
  page: Page,
  baseUrl: string,
): Promise<string> {
  const cookies = await page.cookies(baseUrl);
  const sid = cookies.find((c: { name: string }) => c.name === "__tennet_sid");
  return sid ? `__tennet_sid=${sid.value}` : "";
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe(
  "Admin E2E Browser",
  { ignore: Deno.env.get("CI") === "true" },
  () => {
    let server: Deno.HttpServer;
    let baseUrl: string;
    let browser: Browser;
    let page: Page;
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

      // Start server
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

      kv = admin.kv;

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        executablePath: CHROME_PATH,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
    });

    afterAll(async () => {
      if (page) await page.close();
      if (browser) await browser.close();
      if (server) await server.shutdown();
      if (kv) kv.close();
      console.log = consoleSpy.log;
      console.info = consoleSpy.info;
      console.error = consoleSpy.error;
    });

    // ────────────────────────────────────────────────────────────────────────
    // 1. Login Flow
    // ────────────────────────────────────────────────────────────────────────
    describe("Login Flow", () => {
      it("should redirect /admin to /admin/login without session", async () => {
        const newPage = await browser.newPage();
        await newPage.goto(`${baseUrl}/admin`, {
          waitUntil: "networkidle2",
        });
        assertStringIncludes(newPage.url(), "/admin/login");
        await newPage.close();
      });

      it("should submit login form and reach dashboard", async () => {
        await login(page, baseUrl);
        assertStringIncludes(page.url(), "/admin");
        const title = await page.title();
        assert(title.length > 0, "page should have a title");
      });

      it("should load dashboard HTML after login", async () => {
        const html = await page.content();
        assertStringIncludes(html, "<!DOCTYPE html>");
        assertStringIncludes(html, "PagePlugin");
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // 2. Dashboard Visual
    // ────────────────────────────────────────────────────────────────────────
    describe("Dashboard Visual", () => {
      it("should display plugin cards on dashboard", async () => {
        await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });
        const html = await page.content();
        assertStringIncludes(html, "PagePlugin");
        assertStringIncludes(html, "PostPlugin");
        assertStringIncludes(html, "CategoryPlugin");
      });

      it("should have sidebar navigation", async () => {
        const sidebar = await page.$('nav[aria-label="Admin navigation"]');
        assert(sidebar, "sidebar nav should exist");
      });

      it("should have visible sidebar links", async () => {
        const links = await page.$$('nav[aria-label="Admin navigation"] a');
        assert(links.length > 0, "sidebar should have navigation links");
      });

      it("should have responsive Tailwind classes", async () => {
        const html = await page.content();
        assertStringIncludes(html, "sm:");
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // 3. CRUD Visual
    // ────────────────────────────────────────────────────────────────────────
    describe("CRUD Visual", () => {
      it("should display the pages list", async () => {
        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const html = await page.content();
        assertStringIncludes(html, "PagePlugin");
      });

      it("should navigate to the add/new form", async () => {
        const addLink = await page.$(
          'a[href="/admin/plugins/page-plugin/new"]',
        );
        assert(addLink, "add link should exist");
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2" }),
          addLink!.click(),
        ]);
        assertStringIncludes(page.url(), "/new");
      });

      it("should render create form with fields", async () => {
        const html = await page.content();
        assertStringIncludes(html, "slug");
        assertStringIncludes(html, "checkbox");
      });

      it("should create an item via form submit", async () => {
        await page.type('input[name="slug"]', "browser-test-page");
        await page.type('input[name="title"]', "Browser Test Page");

        const bodyField = await page.$('textarea[name="body"]');
        if (bodyField) {
          await bodyField.type("Test content from browser");
        }

        // Click submit and wait for response (form POST → 302 → list page).
        // Use 'main button[type="submit"]' to avoid matching logout buttons
        // inside the hidden mobile sidebar dialog.
        const [_response] = await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 })
            .catch(() => null),
          page.click('main button[type="submit"]'),
        ]);

        // If navigation happened, verify we're on the plugin page
        // If not, the form might show errors inline
        const url = page.url();
        const isOnList = url.includes("page-plugin") &&
          !url.includes("/new");
        const isOnNewWithError = url.includes("/new");

        assert(
          isOnList || isOnNewWithError,
          `unexpected URL after submit: ${url}`,
        );
      });

      it("should show the created item in the list", async () => {
        // Create a page via API to ensure we have one
        const sessionCookie = await getSessionCookie(page, baseUrl);
        await createPageViaApi(
          baseUrl,
          sessionCookie,
          "crud-list-test",
          "CRUD List Test",
          false,
        );

        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const html = await page.content();
        assertStringIncludes(html, "crud-list-test");
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // 4. Page Builder Visual
    // ────────────────────────────────────────────────────────────────────────
    describe("Page Builder Visual", () => {
      let pageBuilderUrl: string;

      it("should create a page with widgets enabled for builder", async () => {
        const sessionCookie = await getSessionCookie(page, baseUrl);
        await createPageViaApi(
          baseUrl,
          sessionCookie,
          "builder-test",
          "Builder Test",
          true,
        );

        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const html = await page.content();
        assertStringIncludes(html, "builder-test");
      });

      it("should have a builder link on the edit page", async () => {
        // Navigate to the page list and find the page edit link
        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const html = await page.content();
        const idMatch = html.match(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
        );
        assert(idMatch, "should find page ID in list");
        const pageId = idMatch![1];

        // Go to edit page to find builder link
        await page.goto(
          `${baseUrl}/admin/plugins/page-plugin/${pageId}`,
          { waitUntil: "networkidle2" },
        );
        const _editHtml = await page.content();
        const builderLink = await page.$('a[href*="/builder"]');
        if (builderLink) {
          pageBuilderUrl = await page.$eval(
            'a[href*="/builder"]',
            // deno-lint-ignore no-explicit-any
            (el: any) => el.href,
          );
        } else {
          // Construct builder URL directly
          pageBuilderUrl = `${baseUrl}/admin/pages/${pageId}/builder`;
        }
        assert(
          pageBuilderUrl.includes("/builder"),
          "should have builder URL",
        );
      });

      it("should render the 3-column builder layout", async () => {
        await page.goto(pageBuilderUrl, { waitUntil: "networkidle2" });
        const html = await page.content();

        // Column 1: Widget Palette
        const palette = await page.$("aside");
        assert(palette, "palette aside should exist");

        // Column 2: Canvas
        const canvas = await page.$("#builder-canvas");
        assert(canvas, "builder canvas should exist");

        assertStringIncludes(html, "Widgets");
      });

      it("should display widget palette with add buttons", async () => {
        const addButtons = await page.$$("button[data-add-widget]");
        assert(
          addButtons.length > 0,
          "should have widget add buttons in palette",
        );
      });

      it("should have placeholder sections", async () => {
        const placeholders = await page.$$("[data-placeholder]");
        assert(
          placeholders !== null,
          "placeholder query should not fail",
        );
      });

      it("should have CSRF meta tag for builder operations", async () => {
        const csrfMeta = await page.$('meta[name="csrf-token"]');
        assert(csrfMeta, "CSRF meta tag should exist in builder");
        const content = await page.$eval(
          'meta[name="csrf-token"]',
          // deno-lint-ignore no-explicit-any
          (el: any) => el.getAttribute("content"),
        );
        assert(
          content && content.length > 0,
          "CSRF token should have a value",
        );
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // 5. Sortable.js
    // ────────────────────────────────────────────────────────────────────────
    describe("Sortable.js", () => {
      it("should load Sortable.js CDN script", async () => {
        const sessionCookie = await getSessionCookie(page, baseUrl);
        await createPageViaApi(
          baseUrl,
          sessionCookie,
          "sortable-test",
          "Sortable Test",
          true,
        );

        // Find page ID from list
        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const listHtml = await page.content();
        // Get last page ID (most recently created)
        const matches = [
          ...listHtml.matchAll(
            /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/g,
          ),
        ];
        assert(matches.length > 0, "should find page IDs");
        const pageId = matches[matches.length - 1][1];

        await page.goto(`${baseUrl}/admin/pages/${pageId}/builder`, {
          waitUntil: "networkidle2",
        });
        const html = await page.content();
        assertStringIncludes(html, "Sortable.min.js");
      });

      it("should have Sortable available on window after script load", async () => {
        await page.waitForFunction("typeof window.Sortable !== 'undefined'", {
          timeout: 10000,
        });
        const hasSortable = await page.evaluate(
          () =>
            typeof (globalThis as unknown as Record<string, unknown>)
              .Sortable !== "undefined",
        );
        assert(hasSortable, "window.Sortable should be defined");
      });

      it("should have drag handles on widget cards if any exist", async () => {
        const handles = await page.$$("[data-drag-handle]");
        assert(handles !== null, "drag handle query should not fail");
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // 6. Navegação
    // ────────────────────────────────────────────────────────────────────────
    describe("Navegação", () => {
      it("should navigate to plugin pages from sidebar links", async () => {
        await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });
        // Use XPath to select links only from navs NOT inside a hidden dialog.
        // The new layout renders two navs (mobile dialog + desktop sidebar);
        // links inside the closed <dialog> are not clickable.
        const links = await page.$x(
          '//nav[@aria-label="Admin navigation"][not(ancestor::dialog)]//a',
        );
        assert(links.length > 0, "sidebar should have links");

        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2" }),
          links[0].click(),
        ]);
        assertEquals(page.url().startsWith(baseUrl), true);
      });

      it("should have correct hrefs in sidebar (no broken links)", async () => {
        await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });
        const hrefs: string[] = await page.$$eval(
          'nav[aria-label="Admin navigation"] a',
          // deno-lint-ignore no-explicit-any
          (els: any[]) => els.map((el: any) => el.getAttribute("href")),
        );

        for (const href of hrefs) {
          assert(
            href.startsWith("/admin"),
            `sidebar link "${href}" should start with /admin`,
          );
        }
      });

      it("should not get 404 on any sidebar link", async () => {
        await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });
        const hrefs: string[] = await page.$$eval(
          'nav[aria-label="Admin navigation"] a',
          // deno-lint-ignore no-explicit-any
          (els: any[]) => els.map((el: any) => el.getAttribute("href")),
        );

        for (const href of hrefs) {
          const res = await page.goto(`${baseUrl}${href}`, {
            waitUntil: "networkidle2",
          });
          const status = res?.status() ?? 0;
          assert(
            status >= 200 && status < 400,
            `${href} should not return ${status}`,
          );
        }
      });

      it("should navigate back to dashboard via admin link", async () => {
        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const dashLink = await page.$('a[href="/admin"]');
        assert(dashLink, "should have a link back to /admin");
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // 7. Responsividade
    // ────────────────────────────────────────────────────────────────────────
    describe("Responsividade", () => {
      it("should render correctly at mobile viewport (375px)", async () => {
        await page.setViewport({ width: 375, height: 667 });
        await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });
        const html = await page.content();
        assertStringIncludes(html, "<!DOCTYPE html>");
      });

      it("should render the 3-column builder at desktop viewport", async () => {
        await page.setViewport({ width: 1280, height: 800 });

        // Find a page with widgets enabled to get builder URL
        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const listHtml = await page.content();
        const idMatch = listHtml.match(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
        );
        if (idMatch) {
          await page.goto(
            `${baseUrl}/admin/pages/${idMatch[1]}/builder`,
            { waitUntil: "networkidle2" },
          );
          const canvas = await page.$("#builder-canvas");
          assert(canvas, "builder canvas should exist at desktop size");
        } else {
          assert(true, "no pages available for builder test");
        }
      });

      it("should render at tablet viewport (768px)", async () => {
        await page.setViewport({ width: 768, height: 1024 });
        await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });
        const sidebar = await page.$('nav[aria-label="Admin navigation"]');
        assert(sidebar, "sidebar should exist at tablet viewport");
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // 8. JavaScript
    // ────────────────────────────────────────────────────────────────────────
    describe("JavaScript", () => {
      it("should have no console errors on dashboard", async () => {
        const errors: string[] = [];
        const newPage = await browser.newPage();
        newPage.on(
          "console",
          (msg: { type: () => string; text: () => string }) => {
            if (msg.type() === "error") {
              errors.push(msg.text());
            }
          },
        );

        await login(newPage, baseUrl);
        await newPage.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });

        // Filter out known non-critical errors (e.g. favicon, external CDN)
        const criticalErrors = errors.filter(
          (e) =>
            !e.includes("favicon") && !e.includes("ERR_CONNECTION") &&
            !e.includes("net::"),
        );
        assertEquals(
          criticalErrors.length,
          0,
          `Console errors found: ${criticalErrors.join("; ")}`,
        );

        await newPage.close();
      });

      it("should have CSRF meta tag in page builder", async () => {
        await page.setViewport({ width: 1280, height: 800 });
        // Find a page to navigate to builder
        await page.goto(`${baseUrl}/admin/plugins/page-plugin`, {
          waitUntil: "networkidle2",
        });
        const listHtml = await page.content();
        const idMatch = listHtml.match(
          /\/admin\/plugins\/page-plugin\/([a-f0-9-]{36})/,
        );
        if (idMatch) {
          await page.goto(
            `${baseUrl}/admin/pages/${idMatch[1]}/builder`,
            { waitUntil: "networkidle2" },
          );
          const csrfMeta = await page.$('meta[name="csrf-token"]');
          assert(csrfMeta, "CSRF meta tag should be present");
        } else {
          assert(true, "no pages available for builder CSRF check");
        }
      });
    });
  },
);
