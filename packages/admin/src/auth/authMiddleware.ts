import type { Middleware, PermissionAction } from "@leproj/tennet";
import { buildPermissionKey } from "@leproj/tennet";
import type { Permission, Session } from "./types.ts";
import { ROLE_PERMISSIONS } from "./types.ts";
import type { SessionStore } from "./sessionStore.ts";

/** WeakMap associating requests with their authenticated sessions. */
export const requestSession = new WeakMap<Request, Session>();

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

/** Map from plugin slug to resource name for built-in plugins. */
const SLUG_TO_RESOURCE: Record<string, string> = {
  "page-plugin": "pages",
  "post-plugin": "posts",
  "category-plugin": "categories",
  "group-plugin": "groups",
  "user-plugin": "users",
  "settings-plugin": "settings",
};

/** Extract the resource name from an admin URL path. */
function extractResource(path: string): string {
  if (path === "/admin" || path === "/admin/") return "dashboard";

  // Plugin routes: /admin/plugins/<slug>/...
  const pluginMatch = path.match(/^\/admin\/plugins\/([^/]+)/);
  if (pluginMatch) {
    const slug = pluginMatch[1];
    // Return mapped resource for built-in plugins, or the slug itself for dynamic plugins
    return SLUG_TO_RESOURCE[slug] ?? slug;
  }

  // Direct admin sub-routes: /admin/<resource>/...
  // e.g. /admin/pages/[id]/widgets → "pages"
  //      /admin/users/[id]         → "users"
  const directMatch = path.match(/^\/admin\/([^/]+)/);
  if (directMatch) {
    const segment = directMatch[1];
    // Map known segments to resource names
    const SEGMENT_TO_RESOURCE: Record<string, string> = {
      pages: "pages",
      posts: "posts",
      categories: "categories",
      groups: "groups",
      users: "users",
      settings: "settings",
    };
    return SEGMENT_TO_RESOURCE[segment] ?? "dashboard";
  }

  return "dashboard";
}

/** Check if a role has a specific permission on a resource (hardcoded fallback). */
function hasPermission(
  role: string,
  resource: string,
  permission: Permission,
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;
  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;
  return resourcePerms.includes(permission);
}

/** Check permissions dynamically: KV first, then hardcoded fallback. */
async function hasPermissionDynamic(
  kv: Deno.Kv | null,
  role: string,
  resource: string,
  permission: Permission,
): Promise<boolean> {
  if (kv) {
    try {
      const key = buildPermissionKey(role, resource);
      const entry = await kv.get<PermissionAction[]>(key);
      if (entry.value) {
        return entry.value.includes(permission as PermissionAction);
      }
    } catch {
      // KV failure: deny access (fail-closed)
      return false;
    }
  }
  // Fallback to hardcoded permissions
  return hasPermission(role, resource, permission);
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
  store: SessionStore,
  cookieName = DEFAULT_COOKIE_NAME,
  kv: Deno.Kv | null = null,
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

    const session = await store.get(sessionId);
    if (!session) return redirectToLogin();

    // Logout requires a valid session but no RBAC check
    if (path === "/admin/logout") {
      requestSession.set(req, session);
      return next();
    }

    // Check authorization (dynamic KV lookup with hardcoded fallback)
    const resource = extractResource(path);
    const permission = methodToPermission(req.method);
    const allowed = await hasPermissionDynamic(
      kv,
      session.role,
      resource,
      permission,
    );
    if (!allowed) {
      return new Response("Forbidden", { status: 403 });
    }

    // Attach session to request
    requestSession.set(req, session);
    return next();
  };
}
