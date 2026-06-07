import { createServer, type Server } from "node:http";
import process from "node:process";
import type { TenCore } from "../core/tenCore.ts";
import { createRequestListener, type NodeAdapterOptions } from "./adapter.ts";

/** Options for {@link serve}. */
export interface NodeServeOptions extends NodeAdapterOptions {
  /** Port to listen on. Default `3000`. */
  port?: number;
  /** Hostname to bind. Default `0.0.0.0`. */
  hostname?: string;
  /**
   * Wire SIGINT/SIGTERM to a graceful shutdown: stop accepting connections,
   * let in-flight requests finish, then run the core's shutdown hooks.
   * Default `true`.
   */
  gracefulShutdown?: boolean;
  /** Called once the server is listening. */
  onListen?: (info: { hostname: string; port: number }) => void;
}

/**
 * Start a Node `http` server backed by a {@link TenCore} instance.
 *
 * Node runs the runtime-agnostic core; build the app's manifest on Deno
 * (`deno task build`) and pass it as `new TenCore({ embedded: manifest })`.
 *
 * @returns The Node `http.Server` for further lifecycle control.
 *
 * @example
 * ```typescript
 * import { TenCore } from "@leproj/tennet/core";
 * import { serve } from "@leproj/tennet/node";
 *
 * const core = new TenCore({ embedded: manifest });
 * serve(core, { port: 3000 });
 * ```
 */
export function serve(core: TenCore, options: NodeServeOptions = {}): Server {
  const {
    port = 3000,
    hostname = "0.0.0.0",
    gracefulShutdown = true,
    onListen,
    ...adapterOpts
  } = options;

  const server = createServer(createRequestListener(core, adapterOpts));

  server.listen(port, hostname, () => {
    const address = server.address();
    const info = typeof address === "object" && address !== null
      ? { hostname: address.address, port: address.port }
      : { hostname, port };
    onListen?.(info);
  });

  if (gracefulShutdown) registerGracefulShutdown(server, core);

  return server;
}

/** Wire OS termination signals to a graceful shutdown of a Node server. */
function registerGracefulShutdown(server: Server, core: TenCore): void {
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`Received ${signal}, shutting down gracefully...`); // NOSONAR
    // close() stops accepting new connections and fires once in-flight
    // requests have finished.
    server.close(() => {
      void core.runShutdownHooks();
    });
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => shutdown(signal));
  }
}
