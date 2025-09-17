import documentLayout from "../assets/document.html" with { type: "text" };

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
export function findDocumentLayoutRoot(appPath?: string): string {
  if (appPath) {
	  const rootLayoutPath = `${appPath}/document.html`;
	  try {
		  Deno.lstatSync(rootLayoutPath);
		  return Deno.readTextFileSync(rootLayoutPath);
	  } catch {}
  }
	return <string>documentLayout;
}
