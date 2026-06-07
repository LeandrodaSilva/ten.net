import { describe, it } from "@std/testing/bdd";
import { assertRejects } from "@std/assert";
import { viewEngine } from "../src/viewEngine.ts";
import { Route } from "../src/models/Route.ts";

function adminView(body: BodyInit, contentType = "application/json"): Route {
  // Admin path skips filesystem layout reads.
  const r = new Route({
    path: "/admin/x",
    regex: /^\/admin\/x$/,
    hasPage: true,
    transpiledCode: "",
    sourcePath: "",
  });
  r.method = "GET";
  r.page = "<p>{{v}}</p>";
  r.run = () =>
    new Response(body, { headers: { "Content-Type": contentType } });
  return r;
}

describe("viewEngine — invalid route data", () => {
  it("throws when the route returns non-JSON content type", async () => {
    await assertRejects(
      () =>
        viewEngine({
          _appPath: "",
          route: adminView("plain", "text/plain"),
          req: new Request("http://x/admin/x"),
          params: {},
        }),
      Error,
      "must return application/json",
    );
  });

  it("throws when the route returns malformed JSON", async () => {
    await assertRejects(
      () =>
        viewEngine({
          _appPath: "",
          route: adminView("not-json{"),
          req: new Request("http://x/admin/x"),
          params: {},
        }),
      Error,
      "invalid JSON",
    );
  });

  it("throws when the route returns a JSON array instead of an object", async () => {
    await assertRejects(
      () =>
        viewEngine({
          _appPath: "",
          route: adminView("[1,2,3]"),
          req: new Request("http://x/admin/x"),
          params: {},
        }),
      Error,
      "must return a JSON object",
    );
  });
});
