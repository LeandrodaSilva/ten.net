import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { Ten } from "../src/ten.ts";
import { Route } from "../src/models/Route.ts";
import { stubDeno } from "./_deno_stub.ts";

const APP = "./example/http/app";

function apiRoute(path: string, fn: () => Response | Promise<Response>): Route {
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

describe("Ten — public delegators", () => {
  it("use() registers middleware that runs in the pipeline", async () => {
    const app = Ten.net({ appPath: APP });
    (app as unknown as { _routes: Route[] })._routes = [
      apiRoute("/api/m", () => new Response("ok")),
    ];
    app.use(async (_req, next) => {
      const res = await next();
      res.headers.set("x-mw", "1");
      return res;
    });
    const res = await app.fetch(new Request("http://x/api/m"));
    assertEquals(res.headers.get("x-mw"), "1");
    await res.body?.cancel();
  });

  it("onRequest() can short-circuit the pipeline", async () => {
    const app = Ten.net({ appPath: APP });
    app.onRequest(() => new Response("early", { status: 418 }));
    const res = await app.fetch(new Request("http://x/anything"));
    assertEquals(res.status, 418);
    assertEquals(await res.text(), "early");
  });

  it("onResponse() can replace/augment the response", async () => {
    const app = Ten.net({ appPath: APP });
    (app as unknown as { _routes: Route[] })._routes = [
      apiRoute("/api/r", () => new Response("hi")),
    ];
    app.onResponse((_req, res) => {
      res.headers.set("x-resp", "yes");
      return res;
    });
    const res = await app.fetch(new Request("http://x/api/r"));
    assertEquals(res.headers.get("x-resp"), "yes");
    await res.body?.cancel();
  });

  it("onError() customizes the error response", async () => {
    const app = Ten.net({ appPath: APP });
    (app as unknown as { _routes: Route[] })._routes = [
      apiRoute("/api/boom", () => {
        throw new Error("nope");
      }),
    ];
    app.onError(() => new Response("handled", { status: 503 }));
    const errSpy = console.error;
    console.error = () => {};
    try {
      const res = await app.fetch(new Request("http://x/api/boom"));
      assertEquals(res.status, 503);
      assertEquals(await res.text(), "handled");
    } finally {
      console.error = errSpy;
    }
  });

  it("setRenderer() swaps the template engine for view routes", async () => {
    const app = Ten.net({ appPath: APP });
    const view = new Route({
      path: "/admin/v",
      regex: /^\/admin\/v$/,
      hasPage: true,
      transpiledCode: "",
      sourcePath: "",
    });
    view.method = "GET";
    view.page = "<p>[[msg]]</p>";
    view.run = () =>
      new Response(JSON.stringify({ msg: "Hi" }), {
        headers: { "Content-Type": "application/json" },
      });
    (app as unknown as { _routes: Route[] })._routes = [view];
    app.setRenderer((tpl, data) => tpl.replaceAll("[[msg]]", String(data.msg)));
    const res = await app.fetch(new Request("http://x/admin/v"));
    assertEquals(await res.text(), "<p>Hi</p>");
  });

  it("events getter exposes a working event bus", async () => {
    const app = Ten.net({ appPath: APP });
    let seen: unknown;
    app.events.on("ping", (v) => {
      seen = v;
    });
    await app.events.emit("ping", 42);
    assertEquals(seen, 42);
  });

  it("setSitemapEnabled(false) disables /sitemap.xml", async () => {
    const app = Ten.net({ appPath: APP });
    app.setSitemapEnabled(false);
    const res = await app.fetch(new Request("http://x/sitemap.xml"));
    assertEquals(res.status, 404);
    await res.body?.cancel();
  });

  it("setRobotsEnabled(false) disables /robots.txt", async () => {
    const app = Ten.net({ appPath: APP });
    app.setRobotsEnabled(false);
    const res = await app.fetch(new Request("http://x/robots.txt"));
    assertEquals(res.status, 404);
    await res.body?.cancel();
  });

  it("_dynamicRegistry getter reflects the injected registry", () => {
    const app = Ten.net({ appPath: APP });
    const fake = { match: () => null, notFoundPage: null };
    (app as unknown as { _dynamicRegistry: unknown })._dynamicRegistry = fake;
    const got = (app as unknown as { _dynamicRegistry: unknown })
      ._dynamicRegistry;
    assertEquals(got, fake);
  });

  it("_middlewares getter exposes the registered chain", () => {
    const app = Ten.net({ appPath: APP });
    const mw = async (_req: Request, next: () => Promise<Response>) =>
      await next();
    app.use(mw);
    const chain = (app as unknown as { _middlewares: readonly unknown[] })
      ._middlewares;
    assertEquals(chain.length, 1);
    assertEquals(chain[0], mw);
  });

  it("Ten.net({ embedded }) builds a core from the manifest", async () => {
    const manifest = {
      routes: [],
      layouts: {},
      documentHtml: "",
      assets: {
        "/e.css": { dataBase64: btoa("body{}"), mimeType: "text/css" },
      },
    };
    const app = Ten.net({
      // deno-lint-ignore no-explicit-any
      embedded: manifest as any,
      appPath: APP,
    });
    assertEquals(app instanceof Ten, true);
    const res = await app.fetch(new Request("http://x/e.css"));
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Content-Type"), "text/css");
    await res.body?.cancel();
  });

  it("_routes setter clears then sets the route list", () => {
    const app = Ten.net({ appPath: APP });
    (app as unknown as { _routes: Route[] })._routes = [
      apiRoute("/a", () => new Response("a")),
    ];
    const after = (app as unknown as { _routes: readonly Route[] })._routes;
    assertEquals(after.length, 1);
    assertEquals(after[0].path, "/a");
    // Setting an empty list clears without re-adding.
    (app as unknown as { _routes: Route[] })._routes = [];
    assertEquals(
      (app as unknown as { _routes: readonly Route[] })._routes.length,
      0,
    );
  });
});

describe("Ten — runtime SEO defaults from env", () => {
  const KEYS = [
    "TEN_SITE_URL",
    "SITE_URL",
    "TEN_ENV",
    "APP_ENV",
    "DENO_ENV",
    "NODE_ENV",
  ];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of KEYS) saved[k] = Deno.env.get(k);
    for (const k of KEYS) Deno.env.delete(k);
  });
  afterEach(() => {
    for (const k of KEYS) {
      const v = saved[k];
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
  });

  it("applies TEN_SITE_URL and TEN_ENV at construction", async () => {
    Deno.env.set("TEN_SITE_URL", "https://seo-default.test");
    Deno.env.set("TEN_ENV", "production");
    const app = Ten.net({ appPath: APP });
    (app as unknown as { _routes: Route[] })._routes = [
      apiRoute("/about", () => new Response("about")),
    ];
    const res = await app.fetch(new Request("http://x/sitemap.xml"));
    assertEquals(res.status, 200);
    // The canonical base URL from TEN_SITE_URL is used for sitemap <loc>.
    assertStringIncludes(await res.text(), "https://seo-default.test/about");
  });
});

describe("Ten.build (static)", () => {
  it("delegates to the build module with compile disabled", async () => {
    const out = await Deno.makeTempDir({ prefix: "tennet_ten_build_" });
    const logSpy = console.log;
    const infoSpy = console.info;
    console.log = () => {};
    console.info = () => {};
    try {
      const result = await Ten.build({
        appPath: APP,
        output: out,
        compile: false,
        verbose: false,
      });
      assertEquals(result.compiledPath, `${out}/_compiled_app.ts`);
      assertEquals(result.stats.routes > 0, true);
    } finally {
      console.log = logSpy;
      console.info = infoSpy;
      await Deno.remove(out, { recursive: true }).catch(() => {});
    }
  });
});

describe("Ten.useAdmin", () => {
  it("initializes admin routes, middlewares and sitemap entries", async () => {
    const app = Ten.net({ appPath: APP });
    const adminRoute = apiRoute(
      "/admin/ping",
      () => new Response("admin-pong"),
    );
    let sitemapAsked = false;
    await app.useAdmin({
      // deno-lint-ignore require-await
      init: async () => ({
        routes: [adminRoute],
        middlewares: [],
      }),
      // deno-lint-ignore require-await
      getSitemapEntries: async () => {
        sitemapAsked = true;
        return [{ loc: "/blog/post-1", lastmod: "2026-01-01" }];
      },
    });

    const res = await app.fetch(new Request("http://x/admin/ping"));
    assertEquals(await res.text(), "admin-pong");

    // Sitemap generation pulls entries from the admin provider.
    const sm = await app.fetch(new Request("http://x/sitemap.xml"));
    assertEquals(sm.status, 200);
    assertStringIncludes(await sm.text(), "/blog/post-1");
    assertEquals(sitemapAsked, true);
  });
});

describe("Ten — graceful shutdown error branches", () => {
  it("survives watcher.terminate, server.shutdown and listener errors", async () => {
    const app = Ten.net({ appPath: APP });

    let finishedResolve!: () => void;
    const finished = new Promise<void>((r) => {
      finishedResolve = r;
    });
    const fakeServer = {
      finished,
      shutdown: () => Promise.reject(new Error("drain failed")),
      ref: () => {},
      unref: () => {},
    };

    const handlers = new Map<Deno.Signal, () => void>();
    const restoreServe = stubDeno("serve", () => fakeServer);
    const restoreAdd = stubDeno(
      "addSignalListener",
      (sig: Deno.Signal, h: () => void) => {
        // First registration throws to exercise the add catch branch.
        if (sig === "SIGINT" && !handlers.has("SIGINT")) {
          handlers.set("SIGINT", h);
          throw new Error("cannot add SIGINT");
        }
        handlers.set(sig, h);
      },
    );
    const restoreRemove = stubDeno("removeSignalListener", () => {
      throw new Error("cannot remove");
    });

    const infoSpy = console.info;
    const logSpy = console.log;
    const errSpy = console.error;
    console.info = () => {};
    console.log = () => {};
    console.error = () => {};

    try {
      await app.start();
      // Fire a registered signal; shutdown() rejects but must be swallowed.
      const h = handlers.get("SIGTERM") ?? handlers.get("SIGINT");
      h?.();
      // A second signal is a no-op (already shutting down).
      h?.();
      await new Promise((r) => setTimeout(r, 0));
      // Completing the lifecycle triggers removeSignalListener (which throws).
      finishedResolve();
      await finished;
      await Promise.resolve();
    } finally {
      restoreServe();
      restoreAdd();
      restoreRemove();
      console.info = infoSpy;
      console.log = logSpy;
      console.error = errSpy;
    }
  });
});

describe("Ten — shutdown terminates the dev watcher", () => {
  it("calls worker.terminate() during graceful shutdown", async () => {
    const app = Ten.net({ appPath: APP });

    let finishedResolve!: () => void;
    const finished = new Promise<void>((r) => {
      finishedResolve = r;
    });
    const restoreServe = stubDeno("serve", () => ({
      finished,
      shutdown: () => Promise.resolve(),
      ref: () => {},
      unref: () => {},
    }));
    const handlers = new Map<Deno.Signal, () => void>();
    const restoreAdd = stubDeno(
      "addSignalListener",
      (sig: Deno.Signal, h: () => void) => handlers.set(sig, h),
    );
    const restoreRemove = stubDeno("removeSignalListener", () => {});
    Deno.env.set("DEBUG", "true");

    const OriginalWorker = globalThis.Worker;
    let terminated = false;
    // deno-lint-ignore no-explicit-any
    (globalThis as any).Worker = class {
      onmessage: ((e: MessageEvent) => void) | null = null;
      postMessage() {}
      terminate() {
        terminated = true;
        // A throwing terminate must be swallowed by the shutdown handler.
        throw new Error("terminate boom");
      }
    };

    const infoSpy = console.info;
    const logSpy = console.log;
    console.info = () => {};
    console.log = () => {};

    try {
      await app.start();
      const h = handlers.get("SIGTERM") ?? handlers.get("SIGINT");
      h?.();
      await new Promise((r) => setTimeout(r, 0));
      assertEquals(terminated, true);
      finishedResolve();
      await finished;
      await Promise.resolve();
    } finally {
      restoreServe();
      restoreAdd();
      restoreRemove();
      Deno.env.delete("DEBUG");
      globalThis.Worker = OriginalWorker;
      console.info = infoSpy;
      console.log = logSpy;
    }
  });
});

describe("Ten — file watcher error message", () => {
  it("logs watcher errors without reloading routes", async () => {
    const app = Ten.net({ appPath: APP });
    const restoreServe = stubDeno("serve", () => ({
      finished: Promise.resolve(),
      ref: () => {},
      unref: () => {},
    }));
    Deno.env.set("DEBUG", "true");

    const OriginalWorker = globalThis.Worker;
    // deno-lint-ignore no-explicit-any
    let captured: any = null;
    // deno-lint-ignore no-explicit-any
    (globalThis as any).Worker = class {
      onmessage: ((e: MessageEvent) => void) | null = null;
      postMessage() {
        captured = this.onmessage;
      }
      terminate() {}
    };

    const infoSpy = console.info;
    const logSpy = console.log;
    const errSpy = console.error;
    let errored = false;
    console.info = () => {};
    console.log = () => {};
    console.error = () => {
      errored = true;
    };

    try {
      await app.start({ gracefulShutdown: false });
      if (captured) {
        await captured(
          new MessageEvent("message", {
            data: { kind: "error", error: "watcher blew up" },
          }),
        );
      }
      assertEquals(errored, true);
    } finally {
      restoreServe();
      Deno.env.delete("DEBUG");
      globalThis.Worker = OriginalWorker;
      console.info = infoSpy;
      console.log = logSpy;
      console.error = errSpy;
    }
  });
});
