import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { waitForServer } from "./_build_test_helpers.ts";

/**
 * Drives waitForServer through its not-ready branch: the sentinel route first
 * answers with a non-200/non-JSON response (exercising the body-cancel path)
 * before becoming ready.
 */
describe("_build_test_helpers — waitForServer readiness polling", () => {
  it("retries past a not-ready response, then succeeds", async () => {
    let calls = 0;
    const server = Deno.serve(
      { port: 0, onListen: () => {} },
      (req) => {
        const url = new URL(req.url);
        if (url.pathname !== "/api/hello/John") {
          return new Response("nope", { status: 404 });
        }
        calls++;
        // First poll: not ready (plain-text 503 → hits the else/cancel branch).
        if (calls === 1) {
          return new Response("starting", { status: 503 });
        }
        return new Response(JSON.stringify({ message: "Hello John" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    const baseUrl = `http://localhost:${server.addr.port}`;
    try {
      // Small delay keeps the test fast; maxRetries comfortably covers it.
      await waitForServer(baseUrl, 20, 30);
      assertEquals(calls >= 2, true);
    } finally {
      await server.shutdown();
    }
  });
});
