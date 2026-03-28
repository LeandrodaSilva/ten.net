import { decodeBase64, encodeBase64 } from "@std/encoding";

/** Generate a random 16-byte salt. */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/** Hash a password with PBKDF2-SHA256. */
export async function hashPassword(
  password: string,
  salt: Uint8Array,
  iterations = 100_000,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

/** Verify a password against a stored hash and salt. */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  iterations = 100_000,
): Promise<boolean> {
  const salt = decodeBase64(storedSalt);
  const hash = await hashPassword(password, salt, iterations);
  const expected = decodeBase64(storedHash);
  if (hash.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash[i] ^ expected[i];
  }
  return diff === 0;
}

/** Hash a password and return base64-encoded hash and salt. */
export async function createPasswordHash(
  password: string,
  iterations = 100_000,
): Promise<{ hash: string; salt: string }> {
  const salt = generateSalt();
  const hashBytes = await hashPassword(password, salt, iterations);
  return {
    hash: encodeBase64(hashBytes),
    salt: encodeBase64(salt),
  };
}
