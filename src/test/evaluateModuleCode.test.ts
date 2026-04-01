import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { evaluateModuleCode } from "../../packages/core/src/utils/evaluateModuleCode.ts";

describe("evaluateModuleCode", () => {
  describe("direct export function", () => {
    it("should evaluate export function GET", async () => {
      const code = `export function GET(req) { return new Response("hello"); }`;
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
      const res = await (mod.GET as (req: Request) => Response)(
        new Request("http://localhost/"),
      );
      assertEquals(await res.text(), "hello");
    });

    it("should evaluate multiple export functions", async () => {
      const code = [
        `export function GET(req) { return new Response("get"); }`,
        `export function POST(req) { return new Response("post"); }`,
      ].join("\n");
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
      assertEquals(typeof mod.POST, "function");
    });
  });

  describe("bundled export block pattern", () => {
    it("should evaluate function with separate export block", async () => {
      const code = [
        `function GET(_req) { return new Response(JSON.stringify({ name: "Leandro" }), { headers: { "Content-Type": "application/json" } }); }`,
        `export { GET };`,
      ].join("\n");
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
      const res = await (mod.GET as (req: Request) => Response)(
        new Request("http://localhost/"),
      );
      const body = await res.json();
      assertEquals(body.name, "Leandro");
    });

    it("should handle multiline export block (Deno.bundle output)", async () => {
      const code = [
        `function greet(name) { return "Hello, " + name; }`,
        `export {`,
        `  greet`,
        `};`,
      ].join("\n");
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.greet, "function");
      assertEquals(
        (mod.greet as (n: string) => string)("World"),
        "Hello, World",
      );
    });

    it("should handle multiple names in export block", async () => {
      const code = [
        `function GET() { return new Response("get"); }`,
        `function POST() { return new Response("post"); }`,
        `export { GET, POST };`,
      ].join("\n");
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
      assertEquals(typeof mod.POST, "function");
    });
  });

  describe("export const", () => {
    it("should evaluate export const", async () => {
      const code = `export const handler = (req) => new Response("ok");`;
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.handler, "function");
    });

    it("should evaluate export const with non-function value", async () => {
      const code = `export const VERSION = "1.0.0";`;
      const mod = await evaluateModuleCode(code);
      assertEquals(mod.VERSION, "1.0.0");
    });
  });

  describe("async functions", () => {
    it("should evaluate async export function", async () => {
      const code =
        `export async function GET(req) { return new Response("async hello"); }`;
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
      const res = await (mod.GET as (req: Request) => Promise<Response>)(
        new Request("http://localhost/"),
      );
      assertEquals(await res.text(), "async hello");
    });
  });

  describe("export with alias", () => {
    it("should handle 'as' alias in export block", async () => {
      const code = [
        `function handleGet() { return new Response("aliased"); }`,
        `export { handleGet as GET };`,
      ].join("\n");
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
    });
  });

  describe("edge cases", () => {
    it("should return empty object for code with no exports", async () => {
      const code = `const x = 1;`;
      const mod = await evaluateModuleCode(code);
      assertEquals(Object.keys(mod).length, 0);
    });

    it("should return empty object for empty string", async () => {
      const code = ``;
      const mod = await evaluateModuleCode(code);
      assertEquals(Object.keys(mod).length, 0);
    });

    it("should return empty object for code with no exports even if invalid", async () => {
      // Code without export keywords is not evaluated, returns empty
      const code = `invalid javascript content`;
      const mod = await evaluateModuleCode(code);
      assertEquals(Object.keys(mod).length, 0);
    });

    it("should throw for invalid JavaScript that has exports", async () => {
      const code = `export function GET( { return @@@ }`;
      await assertRejects(
        () => evaluateModuleCode(code),
      );
    });

    it("should handle export default", async () => {
      const code = `export default function() { return "default"; }`;
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.default, "function");
    });

    it("should deduplicate export names", async () => {
      const code = [
        `export function GET() { return new Response("ok"); }`,
        `export { GET };`,
      ].join("\n");
      // Should not throw due to duplicate return entries
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
    });
  });

  describe("real-world route patterns", () => {
    it("should handle a typical GET route handler", async () => {
      const code = [
        `function GET(req) {`,
        `  const url = new URL(req.url);`,
        `  const name = url.searchParams.get("name") || "World";`,
        `  return new Response(JSON.stringify({ message: "Hello " + name }), {`,
        `    headers: { "Content-Type": "application/json" }`,
        `  });`,
        `}`,
        `export {`,
        `  GET`,
        `};`,
      ].join("\n");
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
      const res = await (mod.GET as (req: Request) => Response)(
        new Request("http://localhost/?name=Test"),
      );
      const body = await res.json();
      assertEquals(body.message, "Hello Test");
    });

    it("should handle a POST redirect route handler", async () => {
      const code = [
        `export function GET() {`,
        `  return new Response("form page", {`,
        `    headers: { "Content-Type": "text/html" }`,
        `  });`,
        `}`,
        `export function POST(req) {`,
        `  return new Response(null, {`,
        `    status: 302,`,
        `    headers: { "Location": "/congrats" }`,
        `  });`,
        `}`,
      ].join("\n");
      const mod = await evaluateModuleCode(code);
      assertEquals(typeof mod.GET, "function");
      assertEquals(typeof mod.POST, "function");
      const res = await (mod.POST as (req: Request) => Response)(
        new Request("http://localhost/form", { method: "POST" }),
      );
      assertEquals(res.status, 302);
    });
  });
});
