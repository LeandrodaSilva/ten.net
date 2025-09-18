import { assertEquals } from "@deno-assert";
import { paramsEngine } from "../paramsEngine.ts";
import { Route } from "../models/Route.ts";

Deno.test("paramsEngine should be defined", () => {
  assertEquals(typeof paramsEngine, "function");
});

Deno.test("paramsEngine should return an object with expected properties", () => {
  const result = paramsEngine(
    "/users/123",
    new Route({
      path: "/users/[id]",
      hasPage: false,
      transpiledCode: "",
      regex: /^\/users\/([^\/]+?)$/,
      sourcePath: "",
    }),
  );
  assertEquals(result, { id: "123" });
});
