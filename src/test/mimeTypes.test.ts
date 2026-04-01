import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { getMimeType } from "../../packages/core/src/build/mimeTypes.ts";

describe("getMimeType", () => {
  it("should return correct MIME type for common web files", () => {
    assertEquals(getMimeType("style.css"), "text/css");
    assertEquals(getMimeType("app.js"), "application/javascript");
    assertEquals(getMimeType("data.json"), "application/json");
    assertEquals(getMimeType("index.html"), "text/html");
  });

  it("should return correct MIME type for images", () => {
    assertEquals(getMimeType("logo.png"), "image/png");
    assertEquals(getMimeType("photo.jpg"), "image/jpeg");
    assertEquals(getMimeType("photo.jpeg"), "image/jpeg");
    assertEquals(getMimeType("icon.svg"), "image/svg+xml");
    assertEquals(getMimeType("favicon.ico"), "image/x-icon");
    assertEquals(getMimeType("image.webp"), "image/webp");
  });

  it("should return correct MIME type for fonts", () => {
    assertEquals(getMimeType("font.woff"), "font/woff");
    assertEquals(getMimeType("font.woff2"), "font/woff2");
    assertEquals(getMimeType("font.ttf"), "font/ttf");
  });

  it("should be case-insensitive for extensions", () => {
    assertEquals(getMimeType("FILE.CSS"), "text/css");
    assertEquals(getMimeType("IMAGE.PNG"), "image/png");
  });

  it("should return application/octet-stream for unknown extensions", () => {
    assertEquals(getMimeType("file.xyz"), "application/octet-stream");
    assertEquals(getMimeType("data.unknown"), "application/octet-stream");
  });

  it("should handle paths with directories", () => {
    assertEquals(getMimeType("/assets/css/style.css"), "text/css");
    assertEquals(getMimeType("./public/images/logo.png"), "image/png");
  });
});
