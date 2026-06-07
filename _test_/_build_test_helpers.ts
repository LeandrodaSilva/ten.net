import {
  assertEquals,
  assertNotMatch,
  assertStringIncludes,
} from "@std/assert";

/** Verify that no raw `{{...}}` template variables remain in rendered HTML. */
export function assertNoRawTemplateVars(body: string, context?: string): void {
  assertNotMatch(
    body,
    /\{\{[^}]+\}\}/,
    `Rendered HTML should not contain raw template variables${
      context ? ` (${context})` : ""
    }`,
  );
}

export async function assertHomePage(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/`);
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("Content-Type") ?? "", "text/html");
  const body = await res.text();
  assertStringIncludes(body, "<!DOCTYPE html>");
}

export async function assertHelloPage(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/hello`);
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("Content-Type") ?? "", "text/html");
  const body = await res.text();
  assertStringIncludes(body, "Hello Leandro!");
  assertNoRawTemplateVars(body, "GET /hello");
}

export async function assertFormGet(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/form`);
  assertEquals(res.status, 200);
  const body = await res.text();
  assertStringIncludes(body, '<form method="POST">');
}

export async function assertFormPost(baseUrl: string): Promise<void> {
  const formData = new URLSearchParams({ name: "BuildTestUser" });
  const res = await fetch(`${baseUrl}/form`, {
    method: "POST",
    body: formData,
    redirect: "manual",
  });
  assertEquals(res.status, 302);
  const location = res.headers.get("Location");
  assertStringIncludes(location ?? "", "/form/congrats?name=BuildTestUser");
  await res.body?.cancel();
}

export async function assertFormCongrats(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/form/congrats?name=BuildTestUser`);
  assertEquals(res.status, 200);
  const body = await res.text();
  assertStringIncludes(body, "Thanks BuildTestUser for contacting us");
  assertNoRawTemplateVars(body, "GET /form/congrats");
}

export async function assertApiHello(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/hello`);
  assertEquals(res.status, 200);
  const body = await res.text();
  assertEquals(body, "Hello World");
}

export async function assertApiHelloDynamic(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/api/hello/John`);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.message, "Hello John");
}

export async function assertAdminPage(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
  assertEquals(res.status, 302);
  assertStringIncludes(
    res.headers.get("Location") ?? "",
    "/admin/login",
  );
  await res.body?.cancel();
}

export async function assertAdminLoginPage(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/admin/login`);
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("Content-Type") ?? "", "text/html");
  const body = await res.text();
  assertStringIncludes(body, "Sign in to admin");
}

export async function assertFavicon(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/admin/favicon.ico`);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "image/x-icon");
  await res.body?.cancel();
}

export async function assert404(baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/nonexistent`);
  assertEquals(res.status, 404);
  const body = await res.text();
  assertStringIncludes(body, "Not found");
}

export async function waitForServer(
  baseUrl: string,
  maxRetries = 40,
  delay = 300,
): Promise<void> {
  // Poll the dynamic route as the readiness sentinel: it confirms the server
  // is up, that routes (including the lazily-imported dynamic handler) serve
  // correctly, AND that this is our server (guards against a foreign process
  // that grabbed the port during the spawn race under `--parallel`).
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/hello/John`);
      const isJson = (res.headers.get("content-type") ?? "").includes(
        "application/json",
      );
      if (res.status === 200 && isJson) {
        const json = await res.json();
        if (json?.message === "Hello John") return;
      } else {
        await res.body?.cancel();
      }
    } catch {
      // Server not accepting connections yet.
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(
    `Server at ${baseUrl} did not become ready after ${maxRetries} retries`,
  );
}
