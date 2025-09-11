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
export function findDocumentLayoutRoot(appPath: string): string {
  const rootLayoutPath = `${appPath}/document.html`;
  try {
    Deno.lstatSync(rootLayoutPath);
    return Deno.readTextFileSync(rootLayoutPath);
  } catch {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Ten.net</title></head><body>{{content}}</body></html>`;
  }
}
