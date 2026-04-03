import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";
import { fire, handle } from "../src/sw/adapter.ts";
import type { FetchEvent } from "../src/sw/types.ts";

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
