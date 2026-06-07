/**
 * Ten.net Node.js adapter.
 *
 * Runs the runtime-agnostic {@link TenCore} on Node's `http` server. Build the
 * application manifest on Deno (`deno task build`) and run it on Node:
 *
 * @example
 * ```typescript
 * import { TenCore } from "@leproj/tennet/core";
 * import { serve } from "@leproj/tennet/node";
 *
 * const core = new TenCore({ embedded: manifest });
 * serve(core, { port: 3000 });
 * ```
 *
 * For finer control, compose the lower-level helpers with your own server:
 *
 * @example
 * ```typescript
 * import { createServer } from "node:http";
 * import { createRequestListener } from "@leproj/tennet/node";
 *
 * createServer(createRequestListener(core)).listen(3000);
 * ```
 *
 * @module
 */
export {
  createRequestListener,
  type NodeAdapterOptions,
  sendWebResponse,
  toWebRequest,
} from "./adapter.ts";
export { type NodeServeOptions, serve } from "./serve.ts";
