import { defaultDocumentHtml } from "../assets/documentHtml.ts";

/**
 * Finds and returns the content of a document layout root file.
 *
 * Attempts to read a `document.html` file from the specified application path.
 * If the file doesn't exist or cannot be read, returns a default HTML template
 * with a placeholder for content injection.
 *
 * @param appPath - The base path of the application where the document.html file should be located
 * @returns The content of the document.html file, or a default HTML template string if the file is not found
 *
 * @example
 * ```typescript
 * const layout = findDocumentLayoutRoot('/path/to/app');
 * // Returns content of /path/to/app/document.html or default template
 * ```
 */
/** Async version — use in request hot path. */
export async function findDocumentLayoutRoot(
  appPath?: string,
): Promise<string> {
  if (appPath) {
    const rootLayoutPath = `${appPath}/document.html`;
    try {
      await Deno.lstat(rootLayoutPath);
      return await Deno.readTextFile(rootLayoutPath);
    } catch {
      // File does not exist or cannot be read, return default layout
    }
  }
  return defaultDocumentHtml;
}

/** Sync version — use in build/startup only. */
export function findDocumentLayoutRootSync(appPath?: string): string {
  if (appPath) {
    const rootLayoutPath = `${appPath}/document.html`;
    try {
      Deno.lstatSync(rootLayoutPath);
      return Deno.readTextFileSync(rootLayoutPath);
    } catch {
      // File does not exist or cannot be read, return default layout
    }
  }
  return defaultDocumentHtml;
}
