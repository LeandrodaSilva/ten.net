/**
 * Universal base-64 decoder using the Web-standard `atob()` function.
 *
 * Works in browsers, Service Workers, Deno, Node.js ≥ 16, and
 * Cloudflare Workers — anywhere the Web Platform APIs are available.
 *
 * Drop-in alternative to `decodeBase64` from `@std/encoding` for
 * runtime-agnostic code paths.
 */
export function decodeBase64Universal(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}
