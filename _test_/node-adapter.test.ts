import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { Readable, Writable } from "node:stream";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import {
  createRequestListener,
  sendWebResponse,
  toWebRequest,
} from "../src/node/adapter.ts";
import { serve } from "../src/node/serve.ts";
import { TenCore } from "../src/core/tenCore.ts";
import { Route } from "../src/models/Route.ts";

// --- Mocks for Node's http req/res, backed by real node:stream classes ---

function mockReq(
  method: string,
  url: string,
  headers: IncomingHttpHeaders,
  bodyChunks: Uint8Array[] = [],
): IncomingMessage {
  const readable = Readable.from(bodyChunks) as unknown as IncomingMessage;
  readable.method = method;
  readable.url = url;
  readable.headers = headers;
  return readable;
}

class MockRes extends Writable {
  statusCode = 200;
  sentHeaders: Record<string, unknown> = {};
  headersSent = false;
  chunks: Uint8Array[] = [];

  writeHead(status: number, headers: Record<string, unknown>): this {
    this.statusCode = status;
    this.sentHeaders = headers;
    this.headersSent = true;
    return this;
  }

  override _write(
    chunk: Uint8Array,
    _enc: unknown,
    cb: (err?: Error | null) => void,
  ): void {
    this.chunks.push(chunk);
    cb();
  }

  get text(): string {
    return Buffer.concat(this.chunks).toString();
  }
}

function makeRoute(path: string, run: (req: Request) => Response): Route {
  const route = new Route({
    path,
    regex: new RegExp(`^${path}$`),
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  route.method = "GET";
  route.run = run;
  return route;
}

describe("Node adapter — toWebRequest", () => {
  it("maps method, host-based URL, and headers", () => {
    const req = mockReq("GET", "/path?q=1", {
      host: "example.com",
      "x-test": "yes",
    });
    const web = toWebRequest(req);

    assertEquals(web.method, "GET");
    assertEquals(web.url, "http://example.com/path?q=1");
    assertEquals(web.headers.get("x-test"), "yes");
  });

  it("honours an explicit baseUrl", () => {
    const req = mockReq("GET", "/x", {});
    const web = toWebRequest(req, { baseUrl: "https://base.test" });
    assertEquals(web.url, "https://base.test/x");
  });

  it("streams the request body for non-GET methods", async () => {
    const body = [new TextEncoder().encode("payload")];
    const req = mockReq("POST", "/submit", { host: "h" }, body);
    const web = toWebRequest(req);

    assertEquals(web.method, "POST");
    assertEquals(await web.text(), "payload");
  });
});

describe("Node adapter — sendWebResponse", () => {
  it("writes status, headers, and body", async () => {
    const res = new MockRes();
    const webRes = new Response("hello node", {
      status: 201,
      headers: { "content-type": "text/plain" },
    });

    await sendWebResponse(res as unknown as ServerResponse, webRes);

    assertEquals(res.statusCode, 201);
    assertEquals(res.sentHeaders["content-type"], "text/plain");
    assertEquals(res.text, "hello node");
  });

  it("preserves multiple Set-Cookie headers", async () => {
    const res = new MockRes();
    const headers = new Headers();
    headers.append("set-cookie", "a=1");
    headers.append("set-cookie", "b=2");
    const webRes = new Response("ok", { headers });

    await sendWebResponse(res as unknown as ServerResponse, webRes);

    assertEquals(res.sentHeaders["set-cookie"], ["a=1", "b=2"]);
  });

  it("ends the response when there is no body", async () => {
    const res = new MockRes();
    const webRes = new Response(null, { status: 204 });

    await sendWebResponse(res as unknown as ServerResponse, webRes);

    assertEquals(res.statusCode, 204);
    assertEquals(res.text, "");
  });
});

describe("Node adapter — createRequestListener", () => {
  it("routes a request through TenCore to the Node response", async () => {
    const core = new TenCore({
      routes: [
        makeRoute("/hi", () => new Response("routed!", { status: 200 })),
      ],
    });
    const listener = createRequestListener(core);

    const req = mockReq("GET", "/hi", { host: "localhost" });
    const res = new MockRes();
    const done = new Promise<void>((resolve) => res.on("finish", resolve));

    listener(req, res as unknown as ServerResponse);
    await done;

    assertEquals(res.statusCode, 200);
    assertEquals(res.text, "routed!");
  });

  it("returns 404 for an unmatched route", async () => {
    const core = new TenCore();
    const listener = createRequestListener(core);

    const req = mockReq("GET", "/missing", { host: "localhost" });
    const res = new MockRes();
    const done = new Promise<void>((resolve) => res.on("finish", resolve));

    listener(req, res as unknown as ServerResponse);
    await done;

    assertEquals(res.statusCode, 404);
  });
});

describe("Node adapter — serve", () => {
  it("starts a Node http server that serves requests", async () => {
    const core = new TenCore({
      routes: [makeRoute("/ping", () => new Response("pong"))],
    });

    let server: ReturnType<typeof serve> | undefined;
    const port = await new Promise<number>((resolve) => {
      server = serve(core, {
        port: 0,
        hostname: "127.0.0.1",
        gracefulShutdown: false,
        onListen: (info) => resolve(info.port),
      });
    });

    try {
      const res = await fetch(`http://127.0.0.1:${port}/ping`);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "pong");
    } finally {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
  });
});
