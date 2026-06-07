import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";

function makeRoute(path: string, regex: RegExp): Route {
  const route = new Route({
    path,
    regex,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.run = () => new Response(`ok:${path}`, { status: 200 });
  return route;
}

describe("TenCore route-match cache", () => {
  it("returns consistent results across repeated requests", async () => {
    const core = new TenCore({ routes: [makeRoute("/a", /^\/a$/)] });

    const first = await core.fetch(new Request("http://localhost/a"));
    const second = await core.fetch(new Request("http://localhost/a"));

    assertEquals(first.status, 200);
    assertEquals(await first.text(), "ok:/a");
    assertEquals(second.status, 200);
    assertEquals(await second.text(), "ok:/a");
  });

  it("invalidates a cached miss when routes are added", async () => {
    const core = new TenCore();

    // First request caches the /late path as a miss (404).
    const miss = await core.fetch(new Request("http://localhost/late"));
    assertEquals(miss.status, 404);

    core.addRoutes([makeRoute("/late", /^\/late$/)]);

    // The cached miss must be invalidated so the new route now matches.
    const hit = await core.fetch(new Request("http://localhost/late"));
    assertEquals(hit.status, 200);
    assertEquals(await hit.text(), "ok:/late");
  });

  it("invalidates a cached hit when routes are cleared", async () => {
    const core = new TenCore({ routes: [makeRoute("/gone", /^\/gone$/)] });

    const hit = await core.fetch(new Request("http://localhost/gone"));
    assertEquals(hit.status, 200);

    core.clearRoutes();

    const miss = await core.fetch(new Request("http://localhost/gone"));
    assertEquals(miss.status, 404);
  });

  it("stays correct after exceeding the cache cap (eviction)", async () => {
    const core = new TenCore({ routes: [makeRoute("/keep", /^\/keep$/)] });

    // Flood the cache with distinct missing paths to force eviction.
    for (let i = 0; i < 1100; i++) {
      const res = await core.fetch(new Request(`http://localhost/x${i}`));
      assertEquals(res.status, 404);
    }

    // The real route must still match after eviction churn.
    const res = await core.fetch(new Request("http://localhost/keep"));
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "ok:/keep");
  });
});
