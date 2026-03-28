import type { Middleware } from "../middleware/middleware.ts";
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

  // Login has no session yet — skip CSRF for login POST
  if (url.pathname === "/admin/login") return next();

  const session = requestSession.get(req);
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const cloned = req.clone();
    const formData = await cloned.formData();
    const submittedToken = formData.get("_csrf")?.toString();

    if (!submittedToken || submittedToken !== session.csrfToken) {
      return new Response("Invalid CSRF token", { status: 403 });
    }
  } catch {
    return new Response("Invalid CSRF token", { status: 403 });
  }

  return next();
};
