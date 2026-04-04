import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import { fire, handle, listenForManifestUpdates } from "../src/sw/adapter.ts";
import type { FetchEvent } from "../src/sw/types.ts";
import type { AppManifest } from "../src/build/manifest.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoute(overrides: {
  path: string;
  regex: RegExp;
  method?: string;
  run?: (req: Request) => Response | Promise<Response>;
}): Route {
  const route = new Route({
    path: overrides.path,
    regex: overrides.regex,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  if (overrides.method) route.method = overrides.method;
  if (overrides.run) route.run = overrides.run;
  return route;
}

function makeFetchEvent(url: string): {
  event: FetchEvent;
  respondedWith: Response | PromiseLike<Response> | null;
  getRespondedWith: () => Response | PromiseLike<Response> | null;
} {
  let respondedWith: Response | PromiseLike<Response> | null = null;
  const event = {
    type: "fetch",
    request: new Request(url),
    clientId: "",
    resultingClientId: "",
    respondWith(r: Response | PromiseLike<Response>) {
      respondedWith = r;
    },
    waitUntil(_f: Promise<unknown>) {},
    // Minimal Event interface stubs
    bubbles: false,
    cancelBubble: false,
    cancelable: false,
    composed: false,
    currentTarget: null,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    returnValue: true,
    srcElement: null,
    target: null,
    timeStamp: 0,
    composedPath: () => [],
    initEvent: () => {},
    preventDefault: () => {},
    stopImmediatePropagation: () => {},
    stopPropagation: () => {},
    NONE: 0 as const,
    CAPTURING_PHASE: 1 as const,
    AT_TARGET: 2 as const,
    BUBBLING_PHASE: 3 as const,
  } as unknown as FetchEvent;

  return {
    event,
    get respondedWith() {
      return respondedWith;
    },
    getRespondedWith: () => respondedWith,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SW Adapter — handle()", () => {
  it("should respondWith the core response when status is 200", async () => {
    const route = makeRoute({
      path: "/hello",
      regex: /^\/hello$/,
      method: "GET",
      run: () => new Response("hello sw", { status: 200 }),
    });
    const core = new TenCore({ routes: [route] });

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/hello",
    );
    const handler = handle(core);
    handler(event);

    const res = await getRespondedWith();
    assertEquals(res instanceof Response, true);
    assertEquals((res as Response).status, 200);
    assertEquals(await (res as Response).text(), "hello sw");
  });

  it("should respondWith 404 when no route matches and no fallback", async () => {
    const core = new TenCore();

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/unknown",
    );
    const handler = handle(core);
    handler(event);

    const res = await getRespondedWith();
    assertEquals((res as Response).status, 404);
  });

  it("should call fallback when core returns 404 and fallback is provided", async () => {
    const core = new TenCore();
    let fallbackCalled = false;

    const fallback: typeof fetch = (_input, _init?) => {
      fallbackCalled = true;
      return Promise.resolve(new Response("from network", { status: 200 }));
    };

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/not-found",
    );
    const handler = handle(core, { fallback });
    handler(event);

    const res = await getRespondedWith();
    assertEquals(fallbackCalled, true);
    assertEquals((res as Response).status, 200);
    assertEquals(await (res as Response).text(), "from network");
  });

  it("should NOT call fallback when core returns 200", async () => {
    const route = makeRoute({
      path: "/ok",
      regex: /^\/ok$/,
      method: "GET",
      run: () => new Response("ok", { status: 200 }),
    });
    const core = new TenCore({ routes: [route] });
    let fallbackCalled = false;

    const fallback: typeof fetch = (_input, _init?) => {
      fallbackCalled = true;
      return Promise.resolve(new Response("fallback", { status: 200 }));
    };

    const { event, getRespondedWith } = makeFetchEvent("http://localhost/ok");
    const handler = handle(core, { fallback });
    handler(event);

    await getRespondedWith();
    assertEquals(fallbackCalled, false);
  });
});

describe("SW Adapter — pathPrefix", () => {
  it("should intercept requests matching pathPrefix", async () => {
    const route = makeRoute({
      path: "/hello",
      regex: /^\/hello$/,
      method: "GET",
      run: () => new Response("intercepted", { status: 200 }),
    });
    const core = new TenCore({ routes: [route] });

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/preview/hello",
    );
    const handler = handle(core, { pathPrefix: "/preview" });
    handler(event);

    const res = await getRespondedWith();
    assertEquals((res as Response).status, 200);
    assertEquals(await (res as Response).text(), "intercepted");
  });

  it("should passthrough requests NOT matching pathPrefix", async () => {
    const core = new TenCore({
      routes: [
        makeRoute({
          path: "/hello",
          regex: /^\/hello$/,
          method: "GET",
          run: () => new Response("should not reach"),
        }),
      ],
    });

    let fallbackCalled = false;
    const fallback: typeof fetch = () => {
      fallbackCalled = true;
      return Promise.resolve(new Response("passthrough", { status: 200 }));
    };

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/other/path",
    );
    const handler = handle(core, { pathPrefix: "/preview", fallback });
    handler(event);

    const res = await getRespondedWith();
    assertEquals(fallbackCalled, true);
    assertEquals(await (res as Response).text(), "passthrough");
  });

  it("should strip pathPrefix before passing to TenCore", async () => {
    let receivedUrl = "";
    const route = makeRoute({
      path: "/api/status",
      regex: /^\/api\/status$/,
      method: "GET",
      run: (req) => {
        receivedUrl = new URL(req.url).pathname;
        return new Response("ok");
      },
    });
    const core = new TenCore({ routes: [route] });

    const { event, getRespondedWith } = makeFetchEvent(
      "http://localhost/preview/api/status",
    );
    const handler = handle(core, { pathPrefix: "/preview" });
    handler(event);

    await getRespondedWith();
    assertEquals(receivedUrl, "/api/status");
  });
});

describe("SW Adapter — fire()", () => {
  it("should register addEventListener('fetch') on globalThis/self", () => {
    const route = makeRoute({
      path: "/fire-test",
      regex: /^\/fire-test$/,
      method: "GET",
      run: () => new Response("fired"),
    });
    const core = new TenCore({ routes: [route] });

    // Save original addEventListener
    const original = (self as unknown as Record<string, unknown>)
      .addEventListener as (...args: unknown[]) => void;
    let registeredType: string | null = null;
    let registeredHandler: unknown = null;

    // Mock addEventListener on self
    (self as unknown as Record<string, unknown>).addEventListener = (
      type: unknown,
      handler: unknown,
    ) => {
      registeredType = type as string;
      registeredHandler = handler;
    };

    try {
      fire(core);
      assertEquals(registeredType, "fetch");
      assertEquals(typeof registeredHandler, "function");
    } finally {
      // Restore original
      (self as unknown as Record<string, unknown>).addEventListener = original;
    }
  });
});

describe("SW Adapter — listenForManifestUpdates()", () => {
  it("should update TenCore manifest when receiving UPDATE_MANIFEST message", async () => {
    const oldManifest: AppManifest = {
      routes: [], layouts: {}, documentHtml: "",
      assets: { "/old.css": { mimeType: "text/css", dataBase64: btoa("old") } },
    };
    const core = new TenCore({ embedded: oldManifest });
    await core.fetch(new Request("http://localhost/old.css"));
    assertEquals(await (await core.fetch(new Request("http://localhost/old.css"))).text(), "old");

    let messageHandler: ((evt: MessageEvent) => void) | null = null;
    const original = (self as unknown as Record<string, unknown>).addEventListener as (...args: unknown[]) => void;
    (self as unknown as Record<string, unknown>).addEventListener = (type: unknown, handler: unknown) => {
      if (type === "message") messageHandler = handler as (evt: MessageEvent) => void;
    };

    try {
      listenForManifestUpdates(core);
      assertEquals(typeof messageHandler, "function");

      const newManifest: AppManifest = {
        routes: [], layouts: {}, documentHtml: "",
        assets: { "/new.css": { mimeType: "text/css", dataBase64: btoa("new") } },
      };
      messageHandler!(new MessageEvent("message", {
        data: { type: "UPDATE_MANIFEST", manifest: newManifest },
      }));

      const oldRes = await core.fetch(new Request("http://localhost/old.css"));
      assertEquals(oldRes.status, 404);
      const newRes = await core.fetch(new Request("http://localhost/new.css"));
      assertEquals(newRes.status, 200);
      assertEquals(await newRes.text(), "new");
    } finally {
      (self as unknown as Record<string, unknown>).addEventListener = original;
    }
  });

  it("should ignore messages with unknown type", async () => {
    const manifest: AppManifest = {
      routes: [], layouts: {}, documentHtml: "",
      assets: { "/keep.css": { mimeType: "text/css", dataBase64: btoa("keep") } },
    };
    const core = new TenCore({ embedded: manifest });
    await core.fetch(new Request("http://localhost/keep.css"));

    let messageHandler: ((evt: MessageEvent) => void) | null = null;
    const original = (self as unknown as Record<string, unknown>).addEventListener as (...args: unknown[]) => void;
    (self as unknown as Record<string, unknown>).addEventListener = (type: unknown, handler: unknown) => {
      if (type === "message") messageHandler = handler as (evt: MessageEvent) => void;
    };

    try {
      listenForManifestUpdates(core);
      messageHandler!(new MessageEvent("message", { data: { type: "UNKNOWN", foo: "bar" } }));
      const res = await core.fetch(new Request("http://localhost/keep.css"));
      assertEquals(res.status, 200);
    } finally {
      (self as unknown as Record<string, unknown>).addEventListener = original;
    }
  });
});
