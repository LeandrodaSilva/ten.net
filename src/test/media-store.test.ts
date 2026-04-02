import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import {
  assertEquals,
  assertExists,
  assertRejects,
} from "@std/assert";
import { MediaStore } from "../../packages/widgets/src/mediaStore.ts";

/** Magic bytes para tipos de imagem válidos. */
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47];
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];

/** Helper: cria dados fake de imagem com magic bytes corretos. */
function fakeImage(
  sizeBytes: number,
  magic: number[] = PNG_MAGIC,
): Uint8Array {
  const data = new Uint8Array(Math.max(sizeBytes, magic.length));
  // Escreve magic bytes no início
  for (let i = 0; i < magic.length; i++) {
    data[i] = magic[i];
  }
  // Preenche o restante com dados não-zero para verificar integridade
  for (let i = magic.length; i < sizeBytes; i++) {
    data[i] = i % 256;
  }
  return data;
}

const META = {
  originalName: "photo.png",
  mimeType: "image/png",
  alt: "A test photo",
  uploadedBy: "admin",
};

describe("MediaStore", () => {
  let kv: Deno.Kv;
  let store: MediaStore;

  beforeEach(async () => {
    kv = await Deno.openKv(":memory:");
    store = new MediaStore(kv);
  });

  afterEach(() => {
    kv.close();
  });

  // ── upload ──────────────────────────────────────────────────────────────────

  describe("upload()", () => {
    it("should save metadata, manifest, and chunks in KV", async () => {
      const data = fakeImage(1024); // 1KB
      const item = await store.upload(data, META);

      assertExists(item.id);
      assertEquals(item.originalName, "photo.png");
      assertEquals(item.mimeType, "image/png");
      assertEquals(item.size, 1024);
      assertEquals(item.alt, "A test photo");
      assertEquals(item.uploadedBy, "admin");
      assertExists(item.createdAt);
      // filename = uuid.ext
      assertEquals(item.filename.endsWith(".png"), true);

      // Verify metadata persisted
      const persisted = await store.get(item.id);
      assertExists(persisted);
      assertEquals(persisted!.id, item.id);
    });

    it("should split a 200KB image into ~4 chunks of 60KB", async () => {
      const size = 200 * 1024; // 200KB
      const data = fakeImage(size);
      const item = await store.upload(data, META);

      // 200KB / 60KB = 3.33 → 4 chunks
      const manifest = await kv.get<{ totalChunks: number }>([
        "media",
        "manifest",
        item.id,
      ]);
      assertExists(manifest.value);
      assertEquals(manifest.value!.totalChunks, 4);
    });

    it("should store a small image (10KB) as 1 chunk", async () => {
      const size = 10 * 1024; // 10KB
      const data = fakeImage(size);
      const item = await store.upload(data, META);

      const manifest = await kv.get<{ totalChunks: number }>([
        "media",
        "manifest",
        item.id,
      ]);
      assertExists(manifest.value);
      assertEquals(manifest.value!.totalChunks, 1);
    });

    it("should reject unsupported MIME type (text/plain)", async () => {
      const data = fakeImage(100);
      await assertRejects(
        () =>
          store.upload(data, {
            ...META,
            mimeType: "text/plain",
          }),
        Error,
        "Tipo MIME não suportado",
      );
    });

    it("should reject files larger than 5MB", async () => {
      const data = fakeImage(5 * 1024 * 1024 + 1); // 5MB + 1 byte
      await assertRejects(
        () => store.upload(data, META),
        Error,
        "Arquivo muito grande",
      );
    });
  });

  // ── getBlob ─────────────────────────────────────────────────────────────────

  describe("getBlob()", () => {
    it("should concatenate chunks correctly with original size", async () => {
      const size = 200 * 1024;
      const original = fakeImage(size);
      const item = await store.upload(original, META);

      const blob = await store.getBlob(item.id);
      assertExists(blob);
      assertEquals(blob!.byteLength, size);
      // Verify data integrity — every byte matches
      for (let i = 0; i < size; i++) {
        assertEquals(blob![i], original[i], `byte mismatch at index ${i}`);
      }
    });

    it("should return null for non-existent id", async () => {
      const blob = await store.getBlob("non-existent-id");
      assertEquals(blob, null);
    });
  });

  // ── get ─────────────────────────────────────────────────────────────────────

  describe("get()", () => {
    it("should return MediaItem with correct fields", async () => {
      const item = await store.upload(fakeImage(512, JPEG_MAGIC), {
        ...META,
        originalName: "banner.jpg",
        mimeType: "image/jpeg",
      });

      const retrieved = await store.get(item.id);
      assertExists(retrieved);
      assertEquals(retrieved!.id, item.id);
      assertEquals(retrieved!.filename, item.filename);
      assertEquals(retrieved!.originalName, "banner.jpg");
      assertEquals(retrieved!.mimeType, "image/jpeg");
      assertEquals(retrieved!.size, 512);
      assertEquals(retrieved!.alt, "A test photo");
      assertEquals(retrieved!.uploadedBy, "admin");
      assertExists(retrieved!.createdAt);
    });

    it("should return null for non-existent id", async () => {
      const result = await store.get("does-not-exist");
      assertEquals(result, null);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete()", () => {
    it("should remove metadata, manifest, and all chunks", async () => {
      const item = await store.upload(fakeImage(200 * 1024), META);

      const deleted = await store.delete(item.id);
      assertEquals(deleted, true);

      // Verify everything is gone
      assertEquals(await store.get(item.id), null);
      assertEquals(await store.getBlob(item.id), null);

      const manifest = await kv.get(["media", "manifest", item.id]);
      assertEquals(manifest.value, null);
    });

    it("should return false for non-existent id", async () => {
      const deleted = await store.delete("non-existent");
      assertEquals(deleted, false);
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list()", () => {
    it("should return items paginated", async () => {
      // Upload 5 items
      for (let i = 0; i < 5; i++) {
        await store.upload(fakeImage(100), {
          ...META,
          originalName: `img-${i}.png`,
        });
      }

      const page1 = await store.list({ page: 1, limit: 3 });
      assertEquals(page1.length, 3);

      const page2 = await store.list({ page: 2, limit: 3 });
      assertEquals(page2.length, 2);

      const page3 = await store.list({ page: 3, limit: 3 });
      assertEquals(page3.length, 0);
    });

    it("should filter by name search", async () => {
      await store.upload(fakeImage(100), {
        ...META,
        originalName: "logo-dark.png",
      });
      await store.upload(fakeImage(100), {
        ...META,
        originalName: "banner-hero.png",
      });
      await store.upload(fakeImage(100), {
        ...META,
        originalName: "logo-light.png",
      });

      const results = await store.list({ search: "logo" });
      assertEquals(results.length, 2);
      for (const item of results) {
        assertEquals(item.originalName.includes("logo"), true);
      }
    });
  });

  // ── serve ───────────────────────────────────────────────────────────────────

  describe("serve()", () => {
    it("should return Response with correct Content-Type and Cache-Control", async () => {
      const item = await store.upload(fakeImage(256), META);

      const response = await store.serve(item.id);
      assertEquals(response.status, 200);
      assertEquals(response.headers.get("Content-Type"), "image/png");
      assertEquals(
        response.headers.get("Cache-Control"),
        "public, max-age=31536000, immutable",
      );
      assertEquals(response.headers.get("Content-Length"), "256");
    });

    it("should add CSP header for SVG images", async () => {
      const item = await store.upload(fakeImage(64), {
        ...META,
        mimeType: "image/svg+xml",
        originalName: "icon.svg",
      });

      const response = await store.serve(item.id);
      assertEquals(response.status, 200);
      assertEquals(response.headers.get("Content-Type"), "image/svg+xml");
      assertEquals(
        response.headers.get("Content-Security-Policy"),
        "default-src 'none'",
      );
    });

    it("should return 404 for non-existent id", async () => {
      const response = await store.serve("invalid-uuid");
      assertEquals(response.status, 404);
    });
  });
});
