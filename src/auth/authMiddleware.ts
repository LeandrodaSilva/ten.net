import type { Middleware } from "../middleware/middleware.ts";
import type { Permission, Resource, Session } from "./types.ts";
import { ROLE_PERMISSIONS } from "./types.ts";
import { InMemorySessionStore } from "./sessionStore.ts";
import type { SessionStore } from "./sessionStore.ts";

/** WeakMap associating requests with their authenticated sessions. */
export const requestSession = new WeakMap<Request, Session>();

/** Global session store instance. */
export const sessionStore: SessionStore = new InMemorySessionStore();

const DEFAULT_COOKIE_NAME = "__tennet_sid";

/** Parse a specific cookie value from a Cookie header string. */
export function parseCookie(header: string, name: string): string | undefined {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

/** Map an HTTP method to a permission. */
function methodToPermission(method: string): Permission {
  switch (method.toUpperCase()) {
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "read";
  }
}

/** Extract the resource name from an admin URL path. */
function extractResource(path: string): Resource {
  if (path === "/admin" || path === "/admin/") return "dashboard";
  const match = path.match(/^\/admin\/plugins\/([^/]+)/);
  if (!match) return "dashboard";
  const slug = match[1];
  const slugToResource: Record<string, Resource> = {
    "page-plugin": "pages",
    "post-plugin": "posts",
    "category-plugin": "categories",
    "group-plugin": "groups",
    "user-plugin": "users",
    "settings-plugin": "settings",
  };
  return slugToResource[slug] ?? "dashboard";
}

/** Check if a role has a specific permission on a resource. */
function hasPermission(
  role: string,
  resource: Resource,
  permission: Permission,
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  if (!rolePerms) return false;
  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;
  return resourcePerms.includes(permission);
}

/** Redirect response to the login page. */
function redirectToLogin(): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: "/admin/login" },
  });
}

/** Auth middleware: guards /admin routes, enforces RBAC. */
export function authMiddleware(
  cookieName = DEFAULT_COOKIE_NAME,
): Middleware {
  return async (req: Request, next: () => Promise<Response>) => {
    const url = new URL(req.url);
    const path = url.pathname;

    // Routes that bypass auth
    if (!path.startsWith("/admin")) return next();
    const publicPaths = ["/admin/login", "/admin/favicon.ico"];
    if (publicPaths.some((p) => path === p)) return next();

    // Extract session cookie
    const cookieHeader = req.headers.get("cookie") ?? "";
    const sessionId = parseCookie(cookieHeader, cookieName);

    if (!sessionId) return redirectToLogin();

    const session = await sessionStore.get(sessionId);
    if (!session) return redirectToLogin();

    // Logout requires a valid session but no RBAC check
    if (path === "/admin/logout") {
      requestSession.set(req, session);
      return next();
    }

    // Check authorization
    const resource = extractResource(path);
    const permission = methodToPermission(req.method);
    if (!hasPermission(session.role, resource, permission)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Attach session to request
    requestSession.set(req, session);
    return next();
  };
}
