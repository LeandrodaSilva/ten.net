import type { Middleware } from "../middleware/middleware.ts";

/** Middleware that adds security headers to admin responses. */
export const securityHeadersMiddleware: Middleware = async (
  req: Request,
  next: () => Promise<Response>,
) => {
  const response = await next();
  const url = new URL(req.url);

  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");

  if (url.pathname.startsWith("/admin")) {
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
