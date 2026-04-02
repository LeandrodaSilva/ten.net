const CHUNK_SIZE = 60 * 1024; // 60KB — margem de segurança abaixo do limite de 64KB do Deno KV

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header
};

function validateMagicBytes(data: Uint8Array, mimeType: string): boolean {
  // SVG não tem magic bytes padronizados — aceitar com base no MIME declarado
  if (mimeType === "image/svg+xml") return true;
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return false;
  return expected.every((byte, i) => data[i] === byte);
}

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function extensionFromMime(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? "bin";
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string;
  uploadedBy: string;
  createdAt: string;
}

interface ChunkManifest {
  mediaId: string;
  totalChunks: number;
  totalSize: number;
  chunkSize: number;
  mimeType: string;
}

/**
 * MediaStore — armazena arquivos de mídia no Deno KV usando chunking.
 *
 * Schema KV:
 *   ["media", "items", id]               → MediaItem (metadados)
 *   ["media", "manifest", id]            → ChunkManifest
 *   ["media", "chunks", id, chunkIndex]  → Uint8Array (max 60KB cada)
 *   ["media", "index", "name", lower, id] → id (índice por nome)
 */
export class MediaStore {
  constructor(private readonly kv: Deno.Kv) {}

  async upload(
    fileData: Uint8Array,
    meta: {
      originalName: string;
      mimeType: string;
      alt: string;
      uploadedBy: string;
    },
  ): Promise<MediaItem> {
    if (!ALLOWED_MIMES.has(meta.mimeType)) {
      throw new Error(
        `Tipo MIME não suportado: ${meta.mimeType}. Permitidos: jpeg, png, gif, webp, svg`,
      );
    }
    if (fileData.byteLength > MAX_SIZE) {
      throw new Error(`Arquivo muito grande: máximo 5MB`);
    }
    if (!validateMagicBytes(fileData, meta.mimeType)) {
      throw new Error(
        `Conteúdo do arquivo não corresponde ao tipo MIME declarado: ${meta.mimeType}`,
      );
    }

    const id = crypto.randomUUID();
    const filename = `${id}.${extensionFromMime(meta.mimeType)}`;
    const totalChunks = Math.ceil(fileData.byteLength / CHUNK_SIZE) || 1;

    const atomic = this.kv.atomic();

    for (let i = 0; i < totalChunks; i++) {
      const chunk = fileData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      atomic.set(["media", "chunks", id, i], chunk);
    }

    const manifest: ChunkManifest = {
      mediaId: id,
      totalChunks,
      totalSize: fileData.byteLength,
      chunkSize: CHUNK_SIZE,
      mimeType: meta.mimeType,
    };
    atomic.set(["media", "manifest", id], manifest);

    const mediaItem: MediaItem = {
      id,
      filename,
      originalName: meta.originalName,
      mimeType: meta.mimeType,
      size: fileData.byteLength,
      alt: meta.alt,
      uploadedBy: meta.uploadedBy,
      createdAt: new Date().toISOString(),
    };
    atomic.set(["media", "items", id], mediaItem);

    const lowerName = meta.originalName.toLowerCase();
    atomic.set(["media", "index", "name", lowerName, id], id);

    await atomic.commit();
    return mediaItem;
  }

  async get(id: string): Promise<MediaItem | null> {
    const entry = await this.kv.get<MediaItem>(["media", "items", id]);
    return entry.value;
  }

  async getBlob(id: string): Promise<Uint8Array | null> {
    const manifestEntry = await this.kv.get<ChunkManifest>([
      "media",
      "manifest",
      id,
    ]);
    const manifest = manifestEntry.value;
    if (!manifest) return null;

    const chunks: Uint8Array[] = [];
    for (let i = 0; i < manifest.totalChunks; i++) {
      const chunkEntry = await this.kv.get<Uint8Array>([
        "media",
        "chunks",
        id,
        i,
      ]);
      if (!chunkEntry.value) return null;
      chunks.push(chunkEntry.value);
    }

    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const [manifestEntry, itemEntry] = await Promise.all([
      this.kv.get<ChunkManifest>(["media", "manifest", id]),
      this.kv.get<MediaItem>(["media", "items", id]),
    ]);
    if (!manifestEntry.value) return false;

    const atomic = this.kv.atomic();
    for (let i = 0; i < manifestEntry.value.totalChunks; i++) {
      atomic.delete(["media", "chunks", id, i]);
    }
    atomic.delete(["media", "manifest", id]);
    atomic.delete(["media", "items", id]);

    if (itemEntry.value) {
      const lowerName = itemEntry.value.originalName.toLowerCase();
      atomic.delete(["media", "index", "name", lowerName, id]);
    }

    await atomic.commit();
    return true;
  }

  async list(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<MediaItem[]> {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, options?.limit ?? 20);
    const search = options?.search?.toLowerCase();

    const items: MediaItem[] = [];
    const iter = this.kv.list<MediaItem>({ prefix: ["media", "items"] });

    for await (const entry of iter) {
      if (!entry.value) continue;
      if (
        search &&
        !entry.value.originalName.toLowerCase().includes(search) &&
        !entry.value.alt.toLowerCase().includes(search)
      ) {
        continue;
      }
      items.push(entry.value);
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  }

  async serve(id: string): Promise<Response> {
    const [item, blob] = await Promise.all([this.get(id), this.getBlob(id)]);

    if (!item || !blob) {
      return new Response("Not Found", { status: 404 });
    }

    const headers: Record<string, string> = {
      "Content-Type": item.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(blob.byteLength),
      "X-Content-Type-Options": "nosniff",
    };

    if (item.mimeType === "image/svg+xml") {
      headers["Content-Security-Policy"] = "default-src 'none'";
    }

    // Garante ArrayBuffer como BodyInit (compatibilidade TypeScript/Deno)
    const body = blob.buffer.slice(
      blob.byteOffset,
      blob.byteOffset + blob.byteLength,
    ) as ArrayBuffer;

    return new Response(body, { headers });
  }
}
