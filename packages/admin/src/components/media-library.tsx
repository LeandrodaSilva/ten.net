// deno-lint-ignore-file no-explicit-any
import { Script } from "./script.tsx";

export interface MediaItem {
  filename: string;
  originalName: string;
  size: number;
  url: string;
  mimeType?: string;
  alt?: string;
  uploadedAt?: string;
}

export interface MediaLibraryProps {
  items: MediaItem[];
  page: number;
  totalPages: number;
  search?: string;
  csrfToken?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary(
  { items, page, totalPages, search, csrfToken }: MediaLibraryProps,
) {
  const separator = search ? `&` : `?`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-x-4">
        <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>
      </div>

      {/* Inline upload form */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <form
          id="media-library-upload-form"
          method="POST"
          action="/admin/media/upload"
          encType="multipart/form-data"
          className="space-y-3"
        >
          {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
          <div
            id="media-library-dropzone"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <svg
              aria-hidden="true"
              className="mx-auto size-7 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="mt-1 text-sm text-gray-600">
              Arraste imagens aqui ou{" "}
              <span className="text-indigo-600 font-medium">
                clique para selecionar
              </span>
            </p>
            <p className="text-xs text-gray-400">Até 5 MB · PNG, JPG, WEBP</p>
            <input
              id="media-library-file-input"
              type="file"
              name="file"
              accept="image/*"
              required
              className="hidden"
            />
          </div>
          <p
            id="media-library-upload-error"
            className="hidden text-sm text-red-600"
          />
          <p
            id="media-library-upload-filename"
            className="hidden text-sm text-gray-700"
          />
          <div className="flex justify-end">
            <button
              id="media-library-upload-submit"
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>

      {/* Search */}
      <form method="GET" action="/admin/media" className="flex gap-x-2">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Buscar por nome..."
          className="block w-full max-w-sm rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
        />
        <button
          type="submit"
          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
        >
          Buscar
        </button>
        {search && (
          <a
            href="/admin/media"
            className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-500 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
          >
            Limpar
          </a>
        )}
      </form>

      {/* Grid or empty state */}
      {items.length === 0
        ? (
          <div className="text-center py-16">
            <svg
              aria-hidden="true"
              className="mx-auto size-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              Nenhuma imagem
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Faça seu primeiro upload.
            </p>
            <div className="mt-6">
              <a
                href="/admin/media/upload"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
              >
                Upload
              </a>
            </div>
          </div>
        )
        : (
          <ul
            role="list"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((item) => (
              <li
                key={item.filename}
                className="relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
              >
                <div className="aspect-video overflow-hidden bg-gray-100">
                  <img
                    src={item.url}
                    alt={item.alt ?? item.originalName}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-start justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-gray-900"
                      title={item.originalName}
                    >
                      {item.originalName}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatSize(item.size)}
                    </p>
                  </div>
                  <form
                    method="POST"
                    action={`/admin/media/${item.filename}/delete`}
                    className="ml-2 shrink-0"
                  >
                    {csrfToken && (
                      <input type="hidden" name="_csrf" value={csrfToken} />
                    )}
                    <button
                      type="submit"
                      data-confirm={`Excluir "${item.originalName}"?`}
                      className="text-xs text-red-500 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

      <Script>
        {() => {
          // @ts-ignore: DOM APIs available at runtime
          const doc = globalThis.document;
          if (!doc) return;

          // --- Inline upload dropzone ---
          // @ts-ignore: DOM APIs
          const dropzone = doc.getElementById("media-library-dropzone") as any;
          // @ts-ignore: DOM APIs
          const fileInput = doc.getElementById(
            "media-library-file-input",
          ) as any;
          // @ts-ignore: DOM APIs
          const errorEl = doc.getElementById(
            "media-library-upload-error",
          ) as any;
          // @ts-ignore: DOM APIs
          const filenameEl = doc.getElementById(
            "media-library-upload-filename",
          ) as any;
          // @ts-ignore: DOM APIs
          const submitBtn = doc.getElementById(
            "media-library-upload-submit",
          ) as any;
          // @ts-ignore: DOM APIs
          const uploadForm = doc.getElementById(
            "media-library-upload-form",
          ) as any;

          function showError(msg: string) {
            if (errorEl) {
              errorEl.textContent = msg;
              errorEl.classList.remove("hidden");
            }
            if (filenameEl) filenameEl.classList.add("hidden");
            if (submitBtn) submitBtn.disabled = true;
          }

          function clearError() {
            if (errorEl) {
              errorEl.textContent = "";
              errorEl.classList.add("hidden");
            }
            if (submitBtn) submitBtn.disabled = false;
          }

          function validateFile(file: File): boolean {
            clearError();
            if (!file.type.startsWith("image/")) {
              showError("Apenas imagens são permitidas.");
              return false;
            }
            if (file.size > 5 * 1024 * 1024) {
              showError("O arquivo excede o limite de 5 MB.");
              return false;
            }
            if (filenameEl) {
              filenameEl.textContent = `Selecionado: ${file.name}`;
              filenameEl.classList.remove("hidden");
            }
            return true;
          }

          if (dropzone && fileInput) {
            dropzone.addEventListener("click", () => fileInput.click());

            // @ts-ignore: DOM APIs
            dropzone.addEventListener("dragover", (e: DragEvent) => {
              e.preventDefault();
              dropzone.classList.add("border-indigo-500", "bg-indigo-50");
            });

            dropzone.addEventListener("dragleave", () => {
              dropzone.classList.remove("border-indigo-500", "bg-indigo-50");
            });

            // @ts-ignore: DOM APIs
            dropzone.addEventListener("drop", (e: DragEvent) => {
              e.preventDefault();
              dropzone.classList.remove("border-indigo-500", "bg-indigo-50");
              // @ts-ignore: DOM APIs
              const files = e.dataTransfer?.files;
              if (!files?.length) return;
              // @ts-ignore: DOM APIs
              const dt = new DataTransfer();
              dt.items.add(files[0]);
              fileInput.files = dt.files;
              validateFile(files[0]);
            });

            fileInput.addEventListener("change", () => {
              const files = fileInput.files;
              if (files?.length) validateFile(files[0]);
            });
          }

          if (uploadForm) {
            // @ts-ignore: DOM APIs
            uploadForm.addEventListener("submit", (e: Event) => {
              const files = fileInput?.files;
              if (!files?.length) {
                e.preventDefault();
                showError("Selecione um arquivo de imagem.");
                return;
              }
              if (!validateFile(files[0])) {
                e.preventDefault();
              }
            });
          }

          // --- Delete confirm ---
          // @ts-ignore: DOM APIs
          doc.addEventListener("click", (e: MouseEvent) => {
            // @ts-ignore: DOM APIs
            const btn = (e.target as HTMLElement)?.closest?.(
              "[data-confirm]",
            ) as any;
            if (!btn) return;
            const message = btn.dataset.confirm ?? "Confirmar?";
            // @ts-ignore: DOM APIs
            if (!globalThis.confirm(message)) {
              e.preventDefault();
            }
          });
        }}
      </Script>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6"
        >
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Página <span className="font-medium">{page}</span> de{" "}
              <span className="font-medium">{totalPages}</span>
            </p>
            <ul
              role="list"
              className="isolate inline-flex -space-x-px rounded-md shadow-xs"
            >
              <li>
                <a
                  href={page > 1
                    ? `/admin/media?${
                      search
                        ? `search=${encodeURIComponent(search)}${separator}`
                        : ""
                    }page=${page - 1}`
                    : undefined}
                  aria-label="Página anterior"
                  aria-disabled={page <= 1 ? "true" : undefined}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset${
                    page <= 1
                      ? " pointer-events-none opacity-50"
                      : " hover:bg-gray-50"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href={page < totalPages
                    ? `/admin/media?${
                      search
                        ? `search=${encodeURIComponent(search)}${separator}`
                        : ""
                    }page=${page + 1}`
                    : undefined}
                  aria-label="Próxima página"
                  aria-disabled={page >= totalPages ? "true" : undefined}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset${
                    page >= totalPages
                      ? " pointer-events-none opacity-50"
                      : " hover:bg-gray-50"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
          <div className="flex flex-1 justify-between sm:hidden">
            {page > 1
              ? (
                <a
                  href={`/admin/media?${
                    search ? `search=${encodeURIComponent(search)}&` : ""
                  }page=${page - 1}`}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Anterior
                </a>
              )
              : <span />}
            {page < totalPages && (
              <a
                href={`/admin/media?${
                  search ? `search=${encodeURIComponent(search)}&` : ""
                }page=${page + 1}`}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Próxima
              </a>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
