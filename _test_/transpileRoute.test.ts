import { assertEquals } from "@std/assert";
import { transpileRoute } from "../src/utils/transpileRoute.ts";
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("transpileRoute should fail with empty path", async () => {
  const code = await transpileRoute("");
  assertEquals(code, "");
});

Deno.test("transpileRoute strips a leading comment line from the output", async () => {
  const tempDir = await Deno.makeTempDir();
  const tsFilePath = `${tempDir}/withComment.ts`;
  await Deno.writeTextFile(
    tsFilePath,
    `// leading banner comment\nexport const x: number = 1;\n`,
  );
  try {
    const jsCode = await transpileRoute(tsFilePath);
    // The leading "//" line is shifted off; the export survives.
    assertEquals(jsCode.startsWith("//"), false);
    assertEquals(jsCode.includes("export const x"), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("transpileRoute returns empty string for a type-only module", async () => {
  const tempDir = await Deno.makeTempDir();
  const tsFilePath = `${tempDir}/typesOnly.ts`;
  await Deno.writeTextFile(tsFilePath, `export type Foo = string;\n`);
  try {
    const jsCode = await transpileRoute(tsFilePath);
    assertEquals(jsCode.trim(), "");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("transpileRoute should transpile a simple TypeScript file", async (t) => {
  // Setup: Create a temporary TypeScript file
  const tempDir = await Deno.makeTempDir();
  const tsFilePath = `${tempDir}/example.ts`;
  const tsContent = `
		export function greet(name: string): string { 
			return 'Hello, ' + name;
		}
	`;
  await Deno.writeTextFile(tsFilePath, tsContent);

  try {
    // Act: Transpile the TypeScript file
    const jsCode = await transpileRoute(tsFilePath);

    // Assert: Check if the output contains expected JavaScript code
    await assertSnapshot(t, jsCode);
  } finally {
    // Cleanup: Remove the temporary directory and its contents
    await Deno.remove(tempDir, { recursive: true });
  }
});
