import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { Ten } from "../src/ten.ts";
import { Route } from "../src/models/Route.ts";
import { faviconBytes } from "../src/assets/faviconData.ts";
import {
  assert404,
  assertAdminLoginPage,
  assertAdminPage,
  assertApiHello,
  assertApiHelloDynamic,
  assertFavicon,
  assertFormCongrats,
  assertFormGet,
  assertFormPost,
  assertHelloPage,
  assertHomePage,
  waitForServer,
} from "./_build_test_helpers.ts";

function route(
  path: string,
  fn: () => Response | Promise<Response>,
): Route {
  const r = new Route({
    path,
    regex: new RegExp(`^${path}$`),
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  r.method = "GET";
  r.run = fn;
  return r;
}

/**
 * Real-server integration: boots the example app through `Ten.net().start()`
 * on an ephemeral port (no `deno compile`), then exercises every route via the
 * shared HTTP assertions. Validates the live start → Deno.serve → fetch path.
 */
describe("Ten — live server (uncompiled) E2E", () => {
  let server: Deno.HttpServer<Deno.NetAddr>;
  let baseUrl: string;
  const consoleSpy = { log: console.log, info: console.info };

  beforeAll(async () => {
    console.log = () => {};
    console.info = () => {};
    const app = Ten.net({ appPath: "./example/http/app" });
    // Register admin-shaped routes so the admin HTTP assertions have targets.
    const adminRoutes = [
      route(
        "/admin",
        () =>
          new Response(null, {
            status: 302,
            headers: { Location: "/admin/login" },
          }),
      ),
      route(
        "/admin/login",
        () =>
          new Response("<!DOCTYPE html><h1>Sign in to admin</h1>", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
      route(
        "/admin/favicon.ico",
        () =>
          new Response(faviconBytes as unknown as BodyInit, {
            headers: { "Content-Type": "image/x-icon" },
          }),
      ),
    ];
    const liveRoutes = (app as unknown as { _routes: Route[] })._routes;
    (liveRoutes as Route[]).push(...adminRoutes);

    server = await app.start({
      port: 0,
      gracefulShutdown: false,
      onListen: () => {},
    });
    baseUrl = `http://localhost:${server.addr.port}`;
    await waitForServer(baseUrl);
  });

  afterAll(async () => {
    await server.shutdown();
    console.log = consoleSpy.log;
    console.info = consoleSpy.info;
  });

  it("serves the home page", () => assertHomePage(baseUrl));
  it("renders the hello view with data", () => assertHelloPage(baseUrl));
  it("serves the form GET page", () => assertFormGet(baseUrl));
  it("redirects on form POST", () => assertFormPost(baseUrl));
  it("renders the congrats page from query param", () =>
    assertFormCongrats(baseUrl));
  it("serves the plain-text API route", () => assertApiHello(baseUrl));
  it("serves the dynamic-param API route", () =>
    assertApiHelloDynamic(baseUrl));
  it("returns 404 for unknown routes", () => assert404(baseUrl));
  it("redirects /admin to the login page", () => assertAdminPage(baseUrl));
  it("serves the admin login page", () => assertAdminLoginPage(baseUrl));
  it("serves the admin favicon", () => assertFavicon(baseUrl));
});
