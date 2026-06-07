import type { IncomingMessage, ServerResponse } from "node:http";
import type { OutgoingHttpHeaders } from "node:http";
import { Readable } from "node:stream";
import type { TenCore } from "../core/tenCore.ts";

/** Options shared by the Node adapter helpers. */
export interface NodeAdapterOptions {
  /**
   * Base origin used to resolve the request URL. Defaults to
   * `http://<Host header>` (or `http://localhost` when absent).
   */
  baseUrl?: string;
}

// `duplex` is required when constructing a Request with a streaming body but is
// not yet part of every RequestInit lib definition.
type StreamingRequestInit = RequestInit & { duplex?: "half" };

/**
 * Build a WHATWG {@link Request} from a Node {@link IncomingMessage}.
 *
 * The request body is streamed (not buffered) for methods that carry one.
 */
export function toWebRequest(
  req: IncomingMessage,
  opts: NodeAdapterOptions = {},
): Request {
  const method = (req.method ?? "GET").toUpperCase();

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else {
      headers.set(key, value);
    }
  }

  const base = opts.baseUrl ?? `http://${req.headers.host ?? "localhost"}`;
  const url = new URL(req.url ?? "/", base);

  const init: StreamingRequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }

  return new Request(url.href, init);
}

/**
 * Write a WHATWG {@link Response} to a Node {@link ServerResponse}, streaming
 * the body and preserving multiple `Set-Cookie` headers.
 */
export async function sendWebResponse(
  res: ServerResponse,
  webRes: Response,
): Promise<void> {
  const headers: OutgoingHttpHeaders = {};
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") headers[key] = value;
  });
  const setCookies = webRes.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) headers["set-cookie"] = setCookies;

  res.writeHead(webRes.status, headers);

  if (!webRes.body) {
    res.end();
    return;
  }

  const nodeStream = Readable.fromWeb(
    webRes.body as unknown as Parameters<typeof Readable.fromWeb>[0],
  );
  nodeStream.pipe(res);
  await new Promise<void>((resolve, reject) => {
    res.on("finish", resolve);
    res.on("error", reject);
    nodeStream.on("error", reject);
  });
}

/**
 * Create a Node `http` request listener that delegates to {@link TenCore.fetch}.
 *
 * @example
 * ```typescript
 * import { createServer } from "node:http";
 * import { TenCore } from "@leproj/tennet/core";
 * import { createRequestListener } from "@leproj/tennet/node";
 *
 * const core = new TenCore({ embedded: manifest });
 * createServer(createRequestListener(core)).listen(3000);
 * ```
 */
export function createRequestListener(
  core: TenCore,
  opts: NodeAdapterOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    void (async () => {
      try {
        const webRes = await core.fetch(toWebRequest(req, opts));
        await sendWebResponse(res, webRes);
      } catch (error) {
        console.error("Node request handling failed", error); // NOSONAR
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        }
        res.end("Internal Server Error");
      }
    })();
  };
}
