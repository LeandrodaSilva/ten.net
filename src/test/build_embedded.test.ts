import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { Ten } from "../../packages/core/src/ten.ts";
import { collectManifest } from "../../packages/core/src/build/collector.ts";
import { AdminPlugin } from "../../packages/admin/src/plugins/adminPlugin.tsx";
import { PagePlugin } from "../../packages/admin/src/plugins/pagePlugin.ts";
import {
  assert404,
  assertAdminPage,
  assertApiHello,
  assertApiHelloDynamic,
  assertFavicon,
  assertFormCongrats,
  assertFormGet,
  assertFormPost,
  assertHelloPage,
  assertHomePage,
} from "./_build_test_helpers.ts";

describe("Build Embedded Integration", () => {
  let server: Deno.HttpServer;
  let baseUrl: string;

  const consoleSpy = {
    log: console.log,
    info: console.info,
    error: console.error,
  };

  beforeAll(async () => {
    console.log = () => {};
    console.info = () => {};
    console.error = () => {};

    const manifest = await collectManifest("./app", "./public");
    const app = Ten.net({ embedded: manifest });
    await app.useAdmin(
      new AdminPlugin({ storage: "memory", plugins: [PagePlugin] }),
    );
    server = await app.start({ port: 0, onListen: () => {} });
    const addr = server.addr as Deno.NetAddr;
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(async () => {
    if (server) {
      await server.shutdown();
    }
    console.log = consoleSpy.log;
    console.info = consoleSpy.info;
    console.error = consoleSpy.error;
  });

  describe("Static pages", () => {
    it("GET / should return the home page", async () => {
      await assertHomePage(baseUrl);
    });
  });

  describe("View routes (template rendering)", () => {
    it("GET /hello should render template with data", async () => {
      await assertHelloPage(baseUrl);
    });
  });

  describe("Form routes", () => {
    it("GET /form should display the form", async () => {
      await assertFormGet(baseUrl);
    });

    it("POST /form should redirect to congrats", async () => {
      await assertFormPost(baseUrl);
    });

    it("GET /form/congrats should render with query param", async () => {
      await assertFormCongrats(baseUrl);
    });
  });

  describe("API routes", () => {
    it("GET /api/hello should return plain text", async () => {
      await assertApiHello(baseUrl);
    });
  });

  describe("Dynamic parameter routes", () => {
    it("GET /api/hello/John should return JSON with param", async () => {
      await assertApiHelloDynamic(baseUrl);
    });
  });

  describe("Admin panel", () => {
    it("GET /admin should render the admin dashboard", async () => {
      await assertAdminPage(baseUrl);
    });
  });

  describe("Favicon", () => {
    it("GET /admin/favicon.ico should return icon", async () => {
      await assertFavicon(baseUrl);
    });
  });

  describe("404 handling", () => {
    it("GET /nonexistent should return 404", async () => {
      await assert404(baseUrl);
    });
  });
});
