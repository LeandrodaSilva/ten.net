import { assertEquals } from "@deno-assert";
import { getRegexRoute } from "../utils/getRegexRoute.ts";

Deno.test("getRegexRoute - static routes - should match exact static routes", () => {
  const regex = getRegexRoute("/users/posts");

  assertEquals(regex.test("/users/posts"), true);
  assertEquals(regex.test("/users/posts/extra"), false);
  assertEquals(regex.test("/users"), false);
  assertEquals(regex.test("/other/posts"), false);
});

Deno.test("getRegexRoute - static routes - should handle root route", () => {
  const regex = getRegexRoute("/");

  assertEquals(regex.test("/"), true);
  assertEquals(regex.test("/users"), false);
  assertEquals(regex.test(""), false);
});

Deno.test("getRegexRoute - static routes - should handle empty route", () => {
  const regex = getRegexRoute("");

  assertEquals(regex.test(""), true);
  assertEquals(regex.test("/"), false);
});

Deno.test("getRegexRoute - dynamic routes - should match single dynamic segment", () => {
  const regex = getRegexRoute("/users/[id]");

  assertEquals(regex.test("/users/123"), true);
  assertEquals(regex.test("/users/abc"), true);
  assertEquals(regex.test("/users/user-123"), true);
  assertEquals(regex.test("/users/"), false);
  assertEquals(regex.test("/users/123/extra"), false);
  assertEquals(regex.test("/users"), false);
});

Deno.test("getRegexRoute - dynamic routes - should match multiple dynamic segments", () => {
  const regex = getRegexRoute("/users/[id]/posts/[slug]");

  assertEquals(regex.test("/users/123/posts/hello-world"), true);
  assertEquals(regex.test("/users/abc/posts/test"), true);
  assertEquals(regex.test("/users/123/posts/"), false);
  assertEquals(regex.test("/users/123/posts"), false);
  assertEquals(regex.test("/users/123/posts/slug/extra"), false);
});

Deno.test("getRegexRoute - dynamic routes - should not match forward slashes in dynamic segments", () => {
  // Add your test implementation here
});
