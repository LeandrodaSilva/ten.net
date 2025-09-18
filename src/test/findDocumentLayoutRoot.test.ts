import { assertEquals } from "@deno-assert";
import { findDocumentLayoutRoot } from "../utils/findDocumentLayoutRoot.ts";
const TEST_DIR = "./test_temp";
const TEST_APP_PATH = `${TEST_DIR}/app`;
const DOCUMENT_HTML_PATH = `${TEST_APP_PATH}/document.html`;
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("findDocumentLayoutRoot - returns file content when document.html exists", async (t) => {
  // Setup
  Deno.mkdirSync(TEST_APP_PATH, { recursive: true });
  Deno.writeTextFileSync(DOCUMENT_HTML_PATH, t.toString());

  try {
    // Act
    const result = findDocumentLayoutRoot(TEST_APP_PATH);

    // Assert
    await assertSnapshot(t, result);
  } finally {
    // Cleanup
    Deno.removeSync(TEST_DIR, { recursive: true });
  }
});

Deno.test("findDocumentLayoutRoot - returns default template when document.html does not exist", async (t) => {
  // Setup
  const nonExistentPath = "./non_existent_path";

  // Act
  const result = findDocumentLayoutRoot(nonExistentPath);

  // Assert
  await assertSnapshot(t, result);
});

Deno.test("findDocumentLayoutRoot - returns default template when file exists but cannot be read", async (t) => {
  // Setup
  Deno.mkdirSync(TEST_APP_PATH, { recursive: true });
  Deno.writeTextFileSync(DOCUMENT_HTML_PATH, "test content");

  // Make file unreadable by changing permissions (Unix-like systems)
  try {
    Deno.chmodSync(DOCUMENT_HTML_PATH, 0o000);
  } catch {
    // Skip this test on systems that don't support chmod
    Deno.removeSync(TEST_DIR, { recursive: true });
    return;
  }

  try {
    // Act
    const result = findDocumentLayoutRoot(TEST_APP_PATH);

    // Assert
    await assertSnapshot(t, result);
  } finally {
    // Cleanup
    try {
      Deno.chmodSync(DOCUMENT_HTML_PATH, 0o644);
    } catch {
      // Ignore cleanup errors
    }
    Deno.removeSync(TEST_DIR, { recursive: true });
  }
});

Deno.test("findDocumentLayoutRoot - handles empty file", () => {
  // Setup
  Deno.mkdirSync(TEST_APP_PATH, { recursive: true });
  Deno.writeTextFileSync(DOCUMENT_HTML_PATH, "");

  try {
    // Act
    const result = findDocumentLayoutRoot(TEST_APP_PATH);

    // Assert
    assertEquals(result, "");
  } finally {
    // Cleanup
    Deno.removeSync(TEST_DIR, { recursive: true });
  }
});

Deno.test("findDocumentLayoutRoot - handles different app paths", () => {
  // Setup
  const customAppPath = `${TEST_DIR}/custom/app/path`;
  const customDocumentPath = `${customAppPath}/document.html`;
  Deno.mkdirSync(customAppPath, { recursive: true });
  const expectedContent = "<html><body>Custom path content</body></html>";
  Deno.writeTextFileSync(customDocumentPath, expectedContent);

  try {
    // Act
    const result = findDocumentLayoutRoot(customAppPath);

    // Assert
    assertEquals(result, expectedContent);
  } finally {
    // Cleanup
    Deno.removeSync(TEST_DIR, { recursive: true });
  }
});
