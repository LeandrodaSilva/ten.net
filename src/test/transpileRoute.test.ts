import { assertEquals } from "@deno-assert";
import { transpileRoute } from "../utils/transpileRoute.ts";
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("transpileRoute should fail with empty path", async () => {
  const code = await transpileRoute("");
  assertEquals(code, "");
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
