import { Route } from "@leproj/tennet";
import { loginPage } from "../components/login-form.tsx";
import { verifyPassword } from "./passwordHasher.ts";
import { parseCookie } from "./authMiddleware.ts";
import { generateCsrfToken } from "./csrfMiddleware.ts";
import type { Session } from "./types.ts";
import type { SessionStore } from "./sessionStore.ts";
import type { UserStore } from "./userStore.ts";

const COOKIE_NAME = "__tennet_sid";
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

function cookieFlags(): string {
  const secure = Deno.env.get("DENO_ENV") === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Strict${secure}`;
}

/** Create auth routes for login and logout. */
export function createAuthRoutes(
  userStore: UserStore,
  sessionStore: SessionStore,
): Route[] {
  const routes: Route[] = [];

  // GET /admin/login — render login form
  const loginGet = new Route({
    path: "/admin/login",
    regex: /^\/admin\/login$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  loginGet.method = "GET";
  loginGet.run = (_req: Request) => {
    return new Response(loginPage(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  };
  routes.push(loginGet);

  // POST /admin/login — authenticate and create session
  const loginPost = new Route({
    path: "/admin/login",
    regex: /^\/admin\/login$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  loginPost.method = "POST";
  loginPost.run = async (req: Request) => {
    const formData = await req.formData();
    const username = formData.get("username")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    const user = await userStore.get(username);
    if (
      !user ||
      !(await verifyPassword(password, user.passwordHash, user.salt))
    ) {
      return new Response(loginPage("Invalid username or password"), {
        status: 401,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Invalidate any existing session to prevent session fixation
    const existingCookie = req.headers.get("cookie") ?? "";
    const existingSessionId = parseCookie(existingCookie, COOKIE_NAME);
    if (existingSessionId) {
      await sessionStore.delete(existingSessionId);
    }

    const sessionId = crypto.randomUUID();
    const csrfToken = generateCsrfToken();
    const session: Session = {
      id: sessionId,
      userId: user.id,
      username: user.username,
      role: user.role,
      csrfToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
    };
    await sessionStore.set(sessionId, session);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin",
        "Set-Cookie": `${COOKIE_NAME}=${sessionId}; ${cookieFlags()}`,
      },
    });
  };
  routes.push(loginPost);

  // POST /admin/logout — destroy session and redirect
  const logoutPost = new Route({
    path: "/admin/logout",
    regex: /^\/admin\/logout$/,
    hasPage: false,
    transpiledCode: "",
    sourcePath: "",
  });
  logoutPost.method = "POST";
  logoutPost.run = async (req: Request) => {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const sessionId = parseCookie(cookieHeader, COOKIE_NAME);
    if (sessionId) {
      await sessionStore.delete(sessionId);
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/login",
        "Set-Cookie": `${COOKIE_NAME}=; ${cookieFlags()}; Max-Age=0`,
      },
    });
  };
  routes.push(logoutPost);

  return routes;
}
