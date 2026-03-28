/**
 * AES-256-GCM encryption utilities for Ten.net code obfuscation builds.
 * Provides key derivation (PBKDF2), encrypt/decrypt, gzip
 * compression, and helpers for protecting compiled application bundles.
 *
 * @module
 */

import { decodeBase64, encodeBase64 } from "@std/encoding";

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/** Derive an AES-256-GCM {@linkcode CryptoKey} from a password and salt using PBKDF2. */
export async function deriveKey(
  secret: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoded.buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt data with AES-256-GCM. Returns the random IV and ciphertext. */
export async function encrypt(
  data: Uint8Array,
  key: CryptoKey,
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      data.buffer as ArrayBuffer,
    ),
  );
  return { iv, ciphertext };
}

/** Decrypt AES-256-GCM ciphertext using the given key and IV. */
export async function decrypt(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer,
    ),
  );
}

/** Export a {@linkcode CryptoKey} as raw bytes. */
export async function exportKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}

/** Import raw key bytes as a decrypt-only AES-256-GCM {@linkcode CryptoKey}. */
export function importKeyRaw(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw.buffer as ArrayBuffer,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["decrypt"],
  );
}

/** Generate a cryptographically random 16-byte salt. */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/** Generate a cryptographically random 32-byte secret encoded as base-64. */
export function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return encodeBase64(bytes);
}

/** Compress data using gzip via the Compression Streams API. */
export async function compressData(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  }).pipeThrough(new CompressionStream("gzip"));

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(new Uint8Array(chunk));
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** Decompress gzip data via the Compression Streams API. */
export async function decompressData(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  }).pipeThrough(new DecompressionStream("gzip"));

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(new Uint8Array(chunk));
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** Decode a base-64 string to bytes. Re-exported from `@std/encoding`. */
export { decodeBase64 };

/** Encode bytes as a base-64 string. Re-exported from `@std/encoding`. */
export { encodeBase64 };
