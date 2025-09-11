import { assertEquals } from "@deno-assert";
import { findDocumentLayoutRoot } from "./findDocumentLayoutRoot.ts";

const TEST_DIR = "./test_temp";
const TEST_APP_PATH = `${TEST_DIR}/app`;
const DOCUMENT_HTML_PATH = `${TEST_APP_PATH}/document.html`;

Deno.test("findDocumentLayoutRoot - returns file content when document.html exists", () => {
  // Setup
  Deno.mkdirSync(TEST_APP_PATH, { recursive: true });
  const expectedContent =
    `<!DOCTYPE html><html><head><title>Custom Layout</title></head><body><div id="app">{{content}}</div></body></html>`;
  Deno.writeTextFileSync(DOCUMENT_HTML_PATH, expectedContent);

  try {
    // Act
    const result = findDocumentLayoutRoot(TEST_APP_PATH);

    // Assert
    assertEquals(result, expectedContent);
  } finally {
    // Cleanup
    Deno.removeSync(TEST_DIR, { recursive: true });
  }
});

Deno.test("findDocumentLayoutRoot - returns default template when document.html does not exist", () => {
  // Setup
  const nonExistentPath = "./non_existent_path";
  const expectedDefault =
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Ten.net</title></head><body>{{content}}</body></html>`;

  // Act
  const result = findDocumentLayoutRoot(nonExistentPath);

  // Assert
  assertEquals(result, expectedDefault);
});

Deno.test("findDocumentLayoutRoot - returns default template when file exists but cannot be read", () => {
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

  const expectedDefault =
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Ten.net</title></head><body>{{content}}</body></html>`;

  try {
    // Act
    const result = findDocumentLayoutRoot(TEST_APP_PATH);

    // Assert
    assertEquals(result, expectedDefault);
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
