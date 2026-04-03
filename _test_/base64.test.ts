import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { decodeBase64Universal } from "../src/core/base64.ts";

describe("decodeBase64Universal", () => {
  it("should decode a known base64 string", () => {
    const encoded = btoa("Hello, World!");
    const result = decodeBase64Universal(encoded);
    const decoded = new TextDecoder().decode(result);
    assertEquals(decoded, "Hello, World!");
  });

  it("should return empty Uint8Array for empty string", () => {
    const result = decodeBase64Universal("");
    assertEquals(result.length, 0);
    assertEquals(result instanceof Uint8Array, true);
  });

  it("should roundtrip with btoa()", () => {
    const original = "Ten.net is a microframework!";
    const encoded = btoa(original);
    const result = decodeBase64Universal(encoded);
    const decoded = new TextDecoder().decode(result);
    assertEquals(decoded, original);
  });

  it("should handle binary data correctly", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    const binary = String.fromCharCode(...bytes);
    const encoded = btoa(binary);
    const result = decodeBase64Universal(encoded);
    assertEquals(result, bytes);
  });

  it("should decode single character", () => {
    const encoded = btoa("A");
    const result = decodeBase64Universal(encoded);
    const decoded = new TextDecoder().decode(result);
    assertEquals(decoded, "A");
  });
});
