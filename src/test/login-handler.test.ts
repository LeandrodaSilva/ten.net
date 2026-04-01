import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createAuthRoutes } from "../../packages/admin/src/auth/loginHandler.ts";
import {
  InMemoryUserStore,
  seedDefaultAdmin,
} from "../../packages/admin/src/auth/userStore.ts";
import { InMemorySessionStore } from "../../packages/admin/src/auth/sessionStore.ts";

/** Helper: extract a cookie value from a Set-Cookie header. */
function extractSessionId(setCookie: string): string {
  const match = setCookie.match(/__tennet_sid=([^;]*)/);
  return match ? match[1] : "";
}

/** Helper: create auth routes with default stores. */
async function setupRoutes() {
  const userStore = new InMemoryUserStore();
  await seedDefaultAdmin(userStore);
  const sessionStore = new InMemorySessionStore();
  const routes = createAuthRoutes(userStore, sessionStore);
  return { routes, sessionStore };
}

describe("createAuthRoutes", () => {
  it("should return exactly 3 routes", async () => {
    const { routes } = await setupRoutes();
    assertEquals(routes.length, 3);
  });

  it("GET /admin/login should return 200 with login page HTML", async () => {
    const { routes } = await setupRoutes();

    const loginGet = routes.find(
      (r) => r.path === "/admin/login" && r.method === "GET",
    );
    assertEquals(loginGet !== undefined, true);

    const req = new Request("http://localhost/admin/login", { method: "GET" });
    const res = await loginGet!.run!(req);

    assertEquals(res.status, 200);
    const body = await res.text();
    assertStringIncludes(body, "Sign in to admin");
  });

  it("POST /admin/login with valid credentials should redirect to /admin", async () => {
    const { routes, sessionStore } = await setupRoutes();

    const loginPost = routes.find(
      (r) => r.path === "/admin/login" && r.method === "POST",
    );
    assertEquals(loginPost !== undefined, true);

    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "admin");

    const req = new Request("http://localhost/admin/login", {
      method: "POST",
      body: formData,
    });
    const res = await loginPost!.run!(req);

    assertEquals(res.status, 302);
    assertEquals(res.headers.get("Location"), "/admin");

    const setCookie = res.headers.get("Set-Cookie") ?? "";
    assertStringIncludes(setCookie, "__tennet_sid=");

    // Clean up the created session
    const sid = extractSessionId(setCookie);
    if (sid) await sessionStore.delete(sid);
  });

  it("POST /admin/login with invalid credentials should return 401", async () => {
    const { routes } = await setupRoutes();

    const loginPost = routes.find(
      (r) => r.path === "/admin/login" && r.method === "POST",
    );
    assertEquals(loginPost !== undefined, true);

    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "wrongpassword");

    const req = new Request("http://localhost/admin/login", {
      method: "POST",
      body: formData,
    });
    const res = await loginPost!.run!(req);

    assertEquals(res.status, 401);
    const body = await res.text();
    assertStringIncludes(body, "Invalid");
  });

  it("POST /admin/logout with session cookie should delete session and redirect", async () => {
    const { routes, sessionStore } = await setupRoutes();

    // First, log in to get a valid session
    const loginPost = routes.find(
      (r) => r.path === "/admin/login" && r.method === "POST",
    );
    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "admin");

    const loginReq = new Request("http://localhost/admin/login", {
      method: "POST",
      body: formData,
    });
    const loginRes = await loginPost!.run!(loginReq);
    const setCookie = loginRes.headers.get("Set-Cookie") ?? "";
    const sid = extractSessionId(setCookie);

    // Verify the session exists before logout
    const sessionBefore = await sessionStore.get(sid);
    assertEquals(sessionBefore !== null, true);

    // Now log out
    const logoutPost = routes.find(
      (r) => r.path === "/admin/logout" && r.method === "POST",
    );
    assertEquals(logoutPost !== undefined, true);

    const logoutReq = new Request("http://localhost/admin/logout", {
      method: "POST",
      headers: { Cookie: `__tennet_sid=${sid}` },
    });
    const logoutRes = await logoutPost!.run!(logoutReq);

    assertEquals(logoutRes.status, 302);
    assertEquals(logoutRes.headers.get("Location"), "/admin/login");

    // Session should be deleted
    const sessionAfter = await sessionStore.get(sid);
    assertEquals(sessionAfter, null);
  });

  it("POST /admin/logout without cookie should still return 302 gracefully", async () => {
    const { routes } = await setupRoutes();

    const logoutPost = routes.find(
      (r) => r.path === "/admin/logout" && r.method === "POST",
    );
    assertEquals(logoutPost !== undefined, true);

    const req = new Request("http://localhost/admin/logout", {
      method: "POST",
    });
    const res = await logoutPost!.run!(req);

    assertEquals(res.status, 302);
    assertEquals(res.headers.get("Location"), "/admin/login");
  });
});
