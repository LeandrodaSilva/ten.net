import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertNotEquals, assertRejects } from "@std/assert";
import {
  compressData,
  decompressData,
  decrypt,
  deriveKey,
  encrypt,
  exportKeyRaw,
  generateSalt,
  generateSecret,
  importKeyRaw,
} from "../../src/build/crypto.ts";

describe("crypto", () => {
  describe("generateSecret", () => {
    it("should generate a non-empty base64 string", () => {
      const secret = generateSecret();
      assertEquals(typeof secret, "string");
      assertEquals(secret.length > 0, true);
    });

    it("should generate different secrets each time", () => {
      const a = generateSecret();
      const b = generateSecret();
      assertNotEquals(a, b);
    });
  });

  describe("generateSalt", () => {
    it("should generate a 16-byte Uint8Array", () => {
      const salt = generateSalt();
      assertEquals(salt instanceof Uint8Array, true);
      assertEquals(salt.length, 16);
    });
  });

  describe("deriveKey", () => {
    it("should derive a CryptoKey from secret and salt", async () => {
      const salt = generateSalt();
      const key = await deriveKey("test-secret", salt);
      assertEquals(key instanceof CryptoKey, true);
    });

    it("should derive the same key for the same secret and salt", async () => {
      const salt = generateSalt();
      const key1 = await deriveKey("same-secret", salt);
      const key2 = await deriveKey("same-secret", salt);

      const raw1 = await exportKeyRaw(key1);
      const raw2 = await exportKeyRaw(key2);

      assertEquals(raw1, raw2);
    });

    it("should derive different keys for different secrets", async () => {
      const salt = generateSalt();
      const key1 = await deriveKey("secret-1", salt);
      const key2 = await deriveKey("secret-2", salt);

      const raw1 = await exportKeyRaw(key1);
      const raw2 = await exportKeyRaw(key2);

      assertNotEquals(raw1, raw2);
    });
  });

  describe("encrypt/decrypt roundtrip", () => {
    it("should encrypt and decrypt data correctly", async () => {
      const salt = generateSalt();
      const key = await deriveKey("my-secret", salt);
      const original = new TextEncoder().encode("Hello, World!");

      const { iv, ciphertext } = await encrypt(original, key);
      const decrypted = await decrypt(ciphertext, key, iv);

      assertEquals(decrypted, original);
    });

    it("should encrypt to different ciphertext each time (random IV)", async () => {
      const salt = generateSalt();
      const key = await deriveKey("my-secret", salt);
      const data = new TextEncoder().encode("test data");

      const result1 = await encrypt(data, key);
      const result2 = await encrypt(data, key);

      assertNotEquals(result1.ciphertext, result2.ciphertext);
      assertNotEquals(result1.iv, result2.iv);
    });

    it("should fail to decrypt with wrong key", async () => {
      const salt = generateSalt();
      const key1 = await deriveKey("right-secret", salt);
      const key2 = await deriveKey("wrong-secret", salt);
      const data = new TextEncoder().encode("sensitive data");

      const { iv, ciphertext } = await encrypt(data, key1);

      await assertRejects(async () => {
        await decrypt(ciphertext, key2, iv);
      });
    });

    it("should handle empty data", async () => {
      const salt = generateSalt();
      const key = await deriveKey("secret", salt);
      const original = new Uint8Array(0);

      const { iv, ciphertext } = await encrypt(original, key);
      const decrypted = await decrypt(ciphertext, key, iv);

      assertEquals(decrypted, original);
    });

    it("should handle large data", async () => {
      const salt = generateSalt();
      const key = await deriveKey("secret", salt);
      const original = new Uint8Array(100_000);
      for (let i = 0; i < original.length; i++) {
        original[i] = i % 256;
      }

      const { iv, ciphertext } = await encrypt(original, key);
      const decrypted = await decrypt(ciphertext, key, iv);

      assertEquals(decrypted, original);
    });
  });

  describe("exportKeyRaw/importKeyRaw roundtrip", () => {
    it("should export and re-import a key that decrypts correctly", async () => {
      const salt = generateSalt();
      const key = await deriveKey("my-secret", salt);
      const data = new TextEncoder().encode("roundtrip test");

      const { iv, ciphertext } = await encrypt(data, key);

      const rawBytes = await exportKeyRaw(key);
      const reimportedKey = await importKeyRaw(rawBytes);
      const decrypted = await decrypt(ciphertext, reimportedKey, iv);

      assertEquals(decrypted, data);
    });
  });

  describe("compress/decompress roundtrip", () => {
    it("should compress and decompress data correctly", async () => {
      const original = new TextEncoder().encode(
        "Hello, World! This is a test string for compression.",
      );

      const compressed = await compressData(original);
      const decompressed = await decompressData(compressed);

      assertEquals(decompressed, original);
    });

    it("should compress repetitive data smaller than original", async () => {
      const repetitive = new TextEncoder().encode("AAAA".repeat(1000));

      const compressed = await compressData(repetitive);

      assertEquals(compressed.length < repetitive.length, true);
    });
  });
});
