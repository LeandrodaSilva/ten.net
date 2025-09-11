import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { pathNamedParams } from "./pathNamedParams.ts";

Deno.test("pathNamedParams - should extract single named parameter", () => {
  const result = pathNamedParams("/users/123", "/users/[id]");
  assertEquals(result, { id: "123" });
});

Deno.test("pathNamedParams - should extract multiple named parameters", () => {
  const result = pathNamedParams(
    "/users/123/posts/456",
    "/users/[id]/posts/[postId]",
  );
  assertEquals(result, { id: "123", postId: "456" });
});

Deno.test("pathNamedParams - should handle mixed static and dynamic segments", () => {
  const result = pathNamedParams(
    "/api/v1/users/789/profile",
    "/api/v1/users/[userId]/profile",
  );
  assertEquals(result, { userId: "789" });
});

Deno.test("pathNamedParams - should return empty object when no named parameters in route", () => {
  const result = pathNamedParams("/static/path", "/static/path");
  assertEquals(result, {});
});

Deno.test("pathNamedParams - should handle empty paths", () => {
  const result = pathNamedParams("", "");
  assertEquals(result, {});
});

Deno.test("pathNamedParams - should handle root path with parameter", () => {
  const result = pathNamedParams("/123", "/[id]");
  assertEquals(result, { id: "123" });
});

Deno.test("pathNamedParams - should handle trailing slashes", () => {
  const result = pathNamedParams("/users/123/", "/users/[id]/");
  assertEquals(result, { id: "123" });
});

Deno.test("pathNamedParams - should handle complex nested parameters", () => {
  const result = pathNamedParams(
    "/org/abc/repos/xyz/issues/999",
    "/org/[orgId]/repos/[repoId]/issues/[issueId]",
  );
  assertEquals(result, { orgId: "abc", repoId: "xyz", issueId: "999" });
});

Deno.test("pathNamedParams - should handle mismatched path and route lengths gracefully", () => {
  const result = pathNamedParams("/users/123/extra", "/users/[id]");
  assertEquals(result, { id: "123" });
});

Deno.test("pathNamedParams - should handle route longer than path", () => {
  const result = pathNamedParams("/users", "/users/[id]/posts/[postId]");
  assertEquals(result, {
    id: undefined,
    postId: undefined,
  });
});
