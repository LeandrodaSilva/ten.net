import { Ten } from "../ten.ts";
import { Route } from "../models/Route.ts";
import { getRegexRoute } from "../utils/getRegexRoute.ts";

export interface ServerContext {
  server: Deno.HttpServer<Deno.NetAddr>;
  baseUrl: string;
}

const consoleSpy = {
  log: console.log,
  info: console.info,
  error: console.error,
};

export function suppressConsole(): void {
  console.log = () => {};
  console.info = () => {};
  console.error = () => {};
}

export function restoreConsole(): void {
  console.log = consoleSpy.log;
  console.info = consoleSpy.info;
  console.error = consoleSpy.error;
}

export async function startServer(): Promise<ServerContext> {
  suppressConsole();
  const app = Ten.net();
  const server = await app.start({ port: 0, onListen: () => {} });
  const addr = server.addr as Deno.NetAddr;
  return { server, baseUrl: `http://localhost:${addr.port}` };
}

export async function stopServer(ctx: ServerContext): Promise<void> {
  await ctx.server.shutdown();
  restoreConsole();
}

export function createRoute(opts: {
  path: string;
  hasPage?: boolean;
  transpiledCode?: string;
  page?: string;
}): Route {
  const route = new Route({
    path: opts.path,
    regex: getRegexRoute(opts.path),
    hasPage: opts.hasPage ?? false,
    transpiledCode: opts.transpiledCode ?? "",
    sourcePath: `./app${opts.path}/route.ts`,
  });
  if (opts.page) route.page = opts.page;
  return route;
}
