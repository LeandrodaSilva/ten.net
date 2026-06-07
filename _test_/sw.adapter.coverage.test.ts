import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { handle } from "../src/sw/adapter.ts";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import type { FetchEvent } from "../src/sw/types.ts";

function apiRoute(path: string): Route {
  const r = new Route({
    path,
    regex: new RegExp(`^${path}$`),
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  r.method = "GET";
  r.run = () => new Response("ok");
  return r;
}

function fakeEvent(
  url: string,
): { evt: FetchEvent; result: () => Promise<Response> } {
  let captured: Response | PromiseLike<Response>;
  const evt = {
    request: new Request(url),
    respondWith(r: Response | PromiseLike<Response>) {
      captured = r;
    },
  } as unknown as FetchEvent;
  return { evt, result: () => Promise.resolve(captured) };
}

describe("sw/adapter — handle with pathPrefix", () => {
  it("strips the prefix and serves matching requests", async () => {
    const core = new TenCore({ routes: [apiRoute("/x")] });
    const { evt, result } = fakeEvent("http://sw/app/x");
    handle(core, { pathPrefix: "/app" })(evt);
    const res = await result();
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "ok");
  });

  it("uses fallback for non-matching prefixes", async () => {
    const core = new TenCore({ routes: [] });
    const { evt, result } = fakeEvent("http://sw/other/path");
    handle(core, {
      pathPrefix: "/app",
      fallback: () => Promise.resolve(new Response("fb", { status: 200 })),
    })(evt);
    const res = await result();
    assertEquals(await res.text(), "fb");
  });

  it("falls through to global fetch when no fallback is configured", async () => {
    const core = new TenCore({ routes: [] });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response("global", { status: 200 }));
    try {
      const { evt, result } = fakeEvent("http://sw/other/path");
      handle(core, { pathPrefix: "/app" })(evt);
      const res = await result();
      assertEquals(await res.text(), "global");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("invokes fallback when the stripped request 404s", async () => {
    const core = new TenCore({ routes: [] });
    const { evt, result } = fakeEvent("http://sw/app/missing");
    handle(core, {
      pathPrefix: "/app",
      fallback: () => Promise.resolve(new Response("nf-fallback")),
    })(evt);
    const res = await result();
    assertEquals(await res.text(), "nf-fallback");
  });

  it("invokes fallback when a no-prefix request 404s", async () => {
    const core = new TenCore({ routes: [] });
    const { evt, result } = fakeEvent("http://sw/missing");
    handle(core, {
      fallback: () => Promise.resolve(new Response("root-fallback")),
    })(evt);
    const res = await result();
    assertEquals(await res.text(), "root-fallback");
  });
});
