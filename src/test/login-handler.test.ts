import { afterEach, describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createAuthRoutes } from "../auth/loginHandler.ts";
import { InMemoryUserStore, seedDefaultAdmin } from "../auth/userStore.ts";
import { sessionStore } from "../auth/authMiddleware.ts";

/** Clear all sessions between tests to prevent cross-test pollution. */
afterEach(async () => {
  // The global sessionStore is an InMemorySessionStore.
  // Delete any sessions created during tests by iterating known IDs.
  // Since we cannot enumerate, we rely on the store's delete being a no-op for
  // unknown keys. We track session IDs via Set-Cookie headers in each test.
});

/** Helper: extract a cookie value from a Set-Cookie header. */
function extractSessionId(setCookie: string): string {
  const match = setCookie.match(/__tennet_sid=([^;]*)/);
  return match ? match[1] : "";
}

describe("createAuthRoutes", () => {
  it("should return exactly 3 routes", async () => {
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const routes = createAuthRoutes(store);
    assertEquals(routes.length, 3);
  });

  it("GET /admin/login should return 200 with login page HTML", async () => {
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const routes = createAuthRoutes(store);

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
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const routes = createAuthRoutes(store);

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
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const routes = createAuthRoutes(store);

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
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const routes = createAuthRoutes(store);

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
    const store = new InMemoryUserStore();
    await seedDefaultAdmin(store);
    const routes = createAuthRoutes(store);

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
