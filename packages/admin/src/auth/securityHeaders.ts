import type { Middleware } from "@leproj/tennet";

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
    const xFrameValue = url.pathname.includes("/builder/preview") ||
        url.pathname.includes("/preview/")
      ? "SAMEORIGIN"
      : "DENY";
    headers.set("X-Frame-Options", xFrameValue);
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
