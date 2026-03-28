import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { Ten } from "../ten.ts";
import { AdminPlugin } from "../plugins/adminPlugin.tsx";
import { PagePlugin } from "../plugins/pagePlugin.ts";
import { PostsPlugin } from "../plugins/postsPlugin.ts";
import { CategoriesPlugin } from "../plugins/categoriesPlugin.ts";
import { GroupsPlugin } from "../plugins/groupsPlugin.ts";
import { UsersPlugin } from "../plugins/usersPlugin.ts";
import { SettingsPlugin } from "../plugins/settingsPlugin.ts";

describe("Demo E2E Integration", () => {
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

    const app = Ten.net();
    await app.useAdmin(
      new AdminPlugin({
        storage: "memory",
        plugins: [
          PagePlugin,
          PostsPlugin,
          CategoriesPlugin,
          GroupsPlugin,
          UsersPlugin,
          SettingsPlugin,
        ],
      }),
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
      const res = await fetch(`${baseUrl}/`);
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/html");
      const body = await res.text();
      assertStringIncludes(body, "<!DOCTYPE html>");
    });
  });

  describe("View routes (template rendering)", () => {
    it("GET /hello should render template with data", async () => {
      const res = await fetch(`${baseUrl}/hello`);
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/html");
      const body = await res.text();
      assertStringIncludes(body, "Hello Leandro!");
    });
  });

  describe("Form routes", () => {
    it("GET /form should display the form", async () => {
      const res = await fetch(`${baseUrl}/form`);
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, '<form method="POST">');
    });

    it("POST /form should redirect to congrats", async () => {
      const formData = new URLSearchParams({ name: "TestUser" });
      const res = await fetch(`${baseUrl}/form`, {
        method: "POST",
        body: formData,
        redirect: "manual",
      });
      assertEquals(res.status, 302);
      const location = res.headers.get("Location");
      assertStringIncludes(location ?? "", "/form/congrats?name=TestUser");
      await res.body?.cancel();
    });

    it("GET /form/congrats should render with query param", async () => {
      const res = await fetch(`${baseUrl}/form/congrats?name=TestUser`);
      assertEquals(res.status, 200);
      const body = await res.text();
      assertStringIncludes(body, "Thanks TestUser for contacting us");
    });
  });

  describe("API routes", () => {
    it("GET /api/hello should return plain text", async () => {
      const res = await fetch(`${baseUrl}/api/hello`);
      assertEquals(res.status, 200);
      const body = await res.text();
      assertEquals(body, "Hello World");
    });
  });

  describe("Dynamic parameter routes", () => {
    it("GET /api/hello/John should return JSON with param", async () => {
      const res = await fetch(`${baseUrl}/api/hello/John`);
      assertEquals(res.status, 200);
      const json = await res.json();
      assertEquals(json.message, "Hello John");
    });

    it("GET /api/hello/Maria should return JSON with param", async () => {
      const res = await fetch(`${baseUrl}/api/hello/Maria`);
      assertEquals(res.status, 200);
      const json = await res.json();
      assertEquals(json.message, "Hello Maria");
    });
  });

  describe("Admin panel", () => {
    it("GET /admin should redirect to login without session", async () => {
      const res = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
      assertEquals(res.status, 302);
      assertStringIncludes(
        res.headers.get("Location") ?? "",
        "/admin/login",
      );
      await res.body?.cancel();
    });

    it("GET /admin/login should return the login form", async () => {
      const res = await fetch(`${baseUrl}/admin/login`);
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/html");
      const body = await res.text();
      assertStringIncludes(body, "Sign in to admin");
      assertStringIncludes(body, 'action="/admin/login"');
    });

    it("POST /admin/login with valid credentials should redirect to /admin", async () => {
      const formData = new URLSearchParams({
        username: "admin",
        password: "admin",
      });
      const res = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        body: formData,
        redirect: "manual",
      });
      assertEquals(res.status, 302);
      assertEquals(res.headers.get("Location"), "/admin");
      const cookie = res.headers.get("Set-Cookie") ?? "";
      assertStringIncludes(cookie, "__tennet_sid=");
      await res.body?.cancel();
    });

    it("POST /admin/login with invalid credentials should return 401", async () => {
      const formData = new URLSearchParams({
        username: "admin",
        password: "wrong",
      });
      const res = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        body: formData,
      });
      assertEquals(res.status, 401);
      const body = await res.text();
      assertStringIncludes(body, "Invalid username or password");
    });

    it("GET /admin with valid session should return 200", async () => {
      // First login to get session cookie
      const loginData = new URLSearchParams({
        username: "admin",
        password: "admin",
      });
      const loginRes = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        body: loginData,
        redirect: "manual",
      });
      const cookie = loginRes.headers.get("Set-Cookie") ?? "";
      await loginRes.body?.cancel();

      // Then access admin with the cookie
      const sessionCookie = cookie.split(";")[0];
      const res = await fetch(`${baseUrl}/admin`, {
        headers: { cookie: sessionCookie },
      });
      assertEquals(res.status, 200);
      await res.text();
    });

    it("POST /admin/logout should clear session and redirect", async () => {
      // First login
      const loginData = new URLSearchParams({
        username: "admin",
        password: "admin",
      });
      const loginRes = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        body: loginData,
        redirect: "manual",
      });
      const cookie = loginRes.headers.get("Set-Cookie") ?? "";
      await loginRes.body?.cancel();

      const sessionCookie = cookie.split(";")[0];
      const res = await fetch(`${baseUrl}/admin/logout`, {
        method: "POST",
        headers: { cookie: sessionCookie },
        redirect: "manual",
      });
      assertEquals(res.status, 302);
      assertEquals(res.headers.get("Location"), "/admin/login");
      await res.body?.cancel();
    });
  });

  describe("Favicon", () => {
    it("GET /admin/favicon.ico should return icon", async () => {
      const res = await fetch(`${baseUrl}/admin/favicon.ico`);
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "image/x-icon");
      await res.body?.cancel();
    });
  });

  describe("404 handling", () => {
    it("GET /nonexistent should return 404", async () => {
      const res = await fetch(`${baseUrl}/nonexistent`);
      assertEquals(res.status, 404);
      const body = await res.text();
      assertStringIncludes(body, "Not found");
    });
  });
});
