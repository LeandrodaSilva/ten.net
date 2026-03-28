import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { Ten } from "../ten.ts";

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
    it("GET /admin should render the admin dashboard", async () => {
      const res = await fetch(`${baseUrl}/admin`);
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/html");
      const body = await res.text();
      assertStringIncludes(body, "<!DOCTYPE html>");
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
