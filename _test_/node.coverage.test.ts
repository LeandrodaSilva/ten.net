import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { Readable, Writable } from "node:stream";
import process from "node:process";
import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { createRequestListener, toWebRequest } from "../src/node/adapter.ts";
import { serve } from "../src/node/serve.ts";
import { TenCore } from "../src/core/tenCore.ts";

function mockReq(
  method: string,
  url: string,
  headers: IncomingHttpHeaders,
): IncomingMessage {
  const r = Readable.from([]) as unknown as IncomingMessage;
  r.method = method;
  r.url = url;
  r.headers = headers;
  return r;
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
  override _write(c: Uint8Array, _e: unknown, cb: () => void): void {
    this.chunks.push(c);
    cb();
  }
  get text(): string {
    return Buffer.concat(this.chunks).toString();
  }
}

describe("Node adapter — extra coverage", () => {
  it("appends multi-value request headers", () => {
    const web = toWebRequest(
      mockReq("GET", "/x", { host: "h", "set-cookie": ["a=1", "b=2"] }),
    );
    const cookie = web.headers.get("set-cookie") ?? "";
    assertEquals(cookie.includes("a=1"), true);
    assertEquals(cookie.includes("b=2"), true);
  });

  it("responds 500 when request handling throws", async () => {
    const core = new TenCore();
    const listener = createRequestListener(core);
    // headers === null makes toWebRequest throw (Object.entries(null)).
    const badReq = mockReq("GET", "/x", null as unknown as IncomingHttpHeaders);
    const res = new MockRes();
    const done = new Promise<void>((resolve) => res.on("finish", resolve));

    const errOrig = console.error;
    console.error = () => {};
    try {
      listener(badReq, res as unknown as ServerResponse);
      await done;
    } finally {
      console.error = errOrig;
    }
    assertEquals(res.statusCode, 500);
    assertEquals(res.text, "Internal Server Error");
  });
});

describe("Node serve — graceful shutdown", () => {
  it("drains and runs shutdown hooks on SIGINT", async () => {
    const core = new TenCore();
    let hookRan = false;
    core.onShutdown(() => {
      hookRan = true;
    });

    const handlers = new Map<string, () => void>();
    // deno-lint-ignore no-explicit-any
    const origOn = (process as any).on;
    // deno-lint-ignore no-explicit-any
    (process as any).on = (event: string, handler: () => void) => {
      if (event === "SIGINT" || event === "SIGTERM") {
        handlers.set(event, handler);
        return process;
      }
      return origOn.call(process, event, handler);
    };

    const info = console.info;
    console.info = () => {};

    let server: ReturnType<typeof serve> | undefined;
    try {
      const port = await new Promise<number>((resolve) => {
        server = serve(core, {
          port: 0,
          hostname: "127.0.0.1",
          onListen: (i) => resolve(i.port),
        });
      });
      // Sanity: the server actually serves before shutdown.
      assertEquals(typeof port, "number");

      // Fire SIGINT → server.close() → runShutdownHooks().
      handlers.get("SIGINT")!();
      await new Promise((r) => setTimeout(r, 80));
      assertEquals(hookRan, true);
    } finally {
      console.info = info;
      // deno-lint-ignore no-explicit-any
      (process as any).on = origOn;
      // Ensure the listener is closed even if shutdown didn't complete.
      await new Promise<void>((resolve) => {
        try {
          server!.close(() => resolve());
        } catch {
          resolve();
        }
      });
    }
  });
});
