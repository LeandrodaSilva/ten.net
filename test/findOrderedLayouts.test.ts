import { assertEquals } from "@deno-assert";
import { findOrderedLayouts } from "../src/utils/findOrderedLayouts.ts";

Deno.test("findOrderedLayouts - should return empty array when no layouts exist", () => {
  const result = findOrderedLayouts("/nonexistent", "/users/profile");
  assertEquals(result, []);
});

Deno.test("findOrderedLayouts - should find root layout only", async () => {
  const tempDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tempDir}/layout.html`, "<html></html>");

  try {
    const result = findOrderedLayouts(tempDir, "/users/profile");
    assertEquals(result, [`${tempDir}/layout.html`]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findOrderedLayouts - should find layouts in hierarchical order", async () => {
  const tempDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tempDir}/layout.html`, "<html></html>");
  await Deno.mkdir(`${tempDir}/users`, { recursive: true });
  await Deno.writeTextFile(`${tempDir}/users/layout.html`, "<html></html>");
  await Deno.mkdir(`${tempDir}/users/profile`, { recursive: true });
  await Deno.writeTextFile(
    `${tempDir}/users/profile/layout.html`,
    "<html></html>",
  );

  try {
    const result = findOrderedLayouts(tempDir, "/users/profile");
    assertEquals(result, [
      `${tempDir}/layout.html`,
      `${tempDir}/users/layout.html`,
      `${tempDir}/users/profile/layout.html`,
    ]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findOrderedLayouts - should skip missing intermediate layouts", async () => {
  const tempDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tempDir}/layout.html`, "<html></html>");
  await Deno.mkdir(`${tempDir}/users/profile`, { recursive: true });
  await Deno.writeTextFile(
    `${tempDir}/users/profile/layout.html`,
    "<html></html>",
  );

  try {
    const result = findOrderedLayouts(tempDir, "/users/profile");
    assertEquals(result, [
      `${tempDir}/layout.html`,
      `${tempDir}/users/profile/layout.html`,
    ]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findOrderedLayouts - should handle empty route", async () => {
  const tempDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tempDir}/layout.html`, "<html></html>");

  try {
    const result = findOrderedLayouts(tempDir, "");
    assertEquals(result, [`${tempDir}/layout.html`]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findOrderedLayouts - should handle route with leading slash", async () => {
  const tempDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tempDir}/layout.html`, "<html></html>");
  await Deno.mkdir(`${tempDir}/api`, { recursive: true });
  await Deno.writeTextFile(`${tempDir}/api/layout.html`, "<html></html>");

  try {
    const result = findOrderedLayouts(tempDir, "/api");
    assertEquals(result, [
      `${tempDir}/layout.html`,
      `${tempDir}/api/layout.html`,
    ]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("findOrderedLayouts - should handle deep nested routes", async () => {
  const tempDir = await Deno.makeTempDir();
  await Deno.mkdir(`${tempDir}/a/b/c/d`, { recursive: true });
  await Deno.writeTextFile(`${tempDir}/a/b/layout.html`, "<html></html>");
  await Deno.writeTextFile(`${tempDir}/a/b/c/d/layout.html`, "<html></html>");

  try {
    const result = findOrderedLayouts(tempDir, "/a/b/c/d");
    assertEquals(result, [
      `${tempDir}/a/b/layout.html`,
      `${tempDir}/a/b/c/d/layout.html`,
    ]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
