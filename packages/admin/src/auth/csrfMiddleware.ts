import type { Middleware } from "@leproj/tennet";
import { requestSession } from "./authMiddleware.ts";

/** Generate a random CSRF token. */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** CSRF middleware: validates _csrf token on state-changing requests. */
export const csrfMiddleware: Middleware = async (
  req: Request,
  next: () => Promise<Response>,
) => {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/admin")) return next();

  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();

  // Login has no session yet, logout destroys the session — skip CSRF for both
  if (url.pathname === "/admin/login" || url.pathname === "/admin/logout") {
    return next();
  }

  const session = requestSession.get(req);
  if (!session) return new Response("Unauthorized", { status: 401 });

  // Check for CSRF token: first in X-CSRF-Token header (JSON APIs), then in form body
  let submittedToken = req.headers.get("X-CSRF-Token");

  if (!submittedToken) {
    try {
      const cloned = req.clone();
      const formData = await cloned.formData();
      submittedToken = formData.get("_csrf")?.toString() ?? null;
    } catch {
      // Body is not form data (e.g. JSON) and no header token was provided
    }
  }

  if (!submittedToken || submittedToken !== session.csrfToken) {
    return new Response("Invalid CSRF token", { status: 403 });
  }

  return next();
};
