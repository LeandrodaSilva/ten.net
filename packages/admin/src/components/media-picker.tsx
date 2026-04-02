import type { MediaItem } from "./media-library.tsx";
import { Script } from "./script.tsx";

export interface MediaPickerModalProps {
  items: MediaItem[];
  baseUrl: string;
}

export function MediaPickerModal({ items, baseUrl }: MediaPickerModalProps) {
  return (
    <div
      id="media-picker-modal"
      className="hidden fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">
            Biblioteca de Mídia
          </h2>
          <button
            type="button"
            id="media-picker-modal-close"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Upload dropzone inline */}
        <div className="border-b border-gray-200 px-4 py-3 shrink-0">
          <div
            id="media-picker-dropzone"
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <p className="text-sm text-gray-500">
              Arraste imagens aqui ou{" "}
              <span className="text-indigo-600 font-medium">
                clique para selecionar
              </span>
            </p>
            <input
              id="media-picker-file-input"
              type="file"
              name="file"
              accept="image/*"
              className="hidden"
            />
          </div>
          <p
            id="media-picker-upload-error"
            className="hidden mt-1 text-xs text-red-600"
          />
        </div>

        {/* Grid */}
        <div
          id="media-picker-modal-grid"
          data-base-url={baseUrl}
          className="flex-1 overflow-y-auto p-4"
        >
          {items.length === 0
            ? (
              <div className="text-center py-8">
                <svg
                  aria-hidden="true"
                  className="mx-auto size-10 text-gray-300"
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
                <p className="mt-2 text-sm text-gray-500">
                  Nenhuma imagem na biblioteca.
                </p>
              </div>
            )
            : (
              <ul
                role="list"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              >
                {items.map((item) => (
                  <li
                    key={item.filename}
                    data-media-item={item.filename}
                    data-media-url={item.url}
                    role="button"
                    tabIndex={0}
                    aria-label={item.originalName}
                    className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-indigo-300 transition-colors"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.alt ?? item.originalName}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p
                        className="truncate text-xs text-gray-600"
                        title={item.originalName}
                      >
                        {item.originalName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      <Script>
        {() => {
          // @ts-ignore: DOM APIs available at runtime
          const doc = globalThis.document;
          if (!doc) return;

          // @ts-ignore: DOM APIs
          const modal = doc.getElementById("media-picker-modal") as any;
          // @ts-ignore: DOM APIs
          const closeBtn = doc.getElementById(
            "media-picker-modal-close",
          ) as any;
          // @ts-ignore: DOM APIs
          const dropzone = doc.getElementById("media-picker-dropzone") as any;
          // @ts-ignore: DOM APIs
          const fileInput = doc.getElementById(
            "media-picker-file-input",
          ) as any;
          // @ts-ignore: DOM APIs
          const uploadError = doc.getElementById(
            "media-picker-upload-error",
          ) as any;

          function closeModal() {
            if (modal) modal.classList.add("hidden");
          }

          function showUploadError(msg: string) {
            if (uploadError) {
              uploadError.textContent = msg;
              uploadError.classList.remove("hidden");
            }
          }

          function clearUploadError() {
            if (uploadError) {
              uploadError.textContent = "";
              uploadError.classList.add("hidden");
            }
          }

          function handleFile(file: File) {
            clearUploadError();
            if (!file.type.startsWith("image/")) {
              showUploadError("Apenas imagens são permitidas.");
              return;
            }
            if (file.size > 5 * 1024 * 1024) {
              showUploadError("O arquivo excede o limite de 5 MB.");
              return;
            }
            const formData = new FormData();
            formData.append("file", file);
            // @ts-ignore: DOM APIs
            const csrfMeta = doc.querySelector(
              'meta[name="csrf-token"]',
            ) as any;
            const csrf = csrfMeta ? csrfMeta.content : "";
            if (csrf) formData.append("_csrf", csrf);
            fetch("/admin/media/upload", {
              method: "POST",
              headers: csrf ? { "X-CSRF-Token": csrf } : {},
              body: formData,
            }).then((res) => {
              if (res.ok) {
                // @ts-ignore: DOM APIs
                globalThis.location.reload();
              } else {
                showUploadError("Erro ao enviar. Tente novamente.");
              }
            }).catch(() => {
              showUploadError("Erro de rede. Tente novamente.");
            });
          }

          // Close on backdrop click
          if (modal) {
            // @ts-ignore: DOM APIs
            modal.addEventListener("click", (e: MouseEvent) => {
              if (e.target === modal) closeModal();
            });
          }

          // Close button
          if (closeBtn) closeBtn.addEventListener("click", closeModal);

          // Image selection via DOM (no postMessage)
          // @ts-ignore: DOM APIs
          doc.addEventListener("click", (e: MouseEvent) => {
            // @ts-ignore: DOM APIs
            const item = (e.target as HTMLElement)?.closest?.(
              "[data-media-item]",
            ) as any;
            if (!item) return;
            // @ts-ignore: DOM APIs
            if (!item.closest("#media-picker-modal")) return;
            const url = item.dataset.mediaUrl ?? item.dataset.mediaItem ?? "";
            const targetField = modal?.dataset?.targetField ?? "";
            if (targetField) {
              // @ts-ignore: DOM APIs
              const input = (doc.querySelector(
                `[name="${targetField}"]`,
              ) ?? doc.getElementById(targetField)) as any;
              if (input) input.value = url;
            }
            closeModal();
          });

          // Dropzone: click to open file picker
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
              if (files?.length) handleFile(files[0]);
            });

            fileInput.addEventListener("change", () => {
              const files = fileInput.files;
              if (files?.length) handleFile(files[0]);
            });
          }
        }}
      </Script>
    </div>
  );
}

export interface MediaPickerProps {
  items: MediaItem[];
  mode: "single" | "multiple";
  baseUrl: string;
}

export function MediaPicker({ items, mode, baseUrl }: MediaPickerProps) {
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {mode === "single" ? "Selecionar imagem" : "Selecionar imagens"}
        </h2>
        <span className="text-xs text-gray-500">
          {mode === "single"
            ? "Clique para selecionar"
            : "Clique para selecionar múltiplas"}
        </span>
      </div>

      {/* Grid */}
      <div
        id="picker-grid"
        data-mode={mode}
        data-base-url={baseUrl}
        className="flex-1 overflow-y-auto p-4"
      >
        {items.length === 0
          ? (
            <div className="text-center py-12">
              <svg
                aria-hidden="true"
                className="mx-auto size-10 text-gray-300"
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
              <p className="mt-2 text-sm text-gray-500">
                Nenhuma imagem na biblioteca.
              </p>
            </div>
          )
          : (
            <ul
              role="list"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            >
              {items.map((item) => (
                <li
                  key={item.filename}
                  data-media-item={item.filename}
                  role="button"
                  tabIndex={0}
                  aria-label={item.originalName}
                  className="relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-all hover:border-indigo-300"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.alt ?? item.originalName}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p
                      className="truncate text-xs text-gray-600"
                      title={item.originalName}
                    >
                      {item.originalName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-x-3 border-t border-gray-200 px-4 py-3">
        <button
          type="button"
          id="picker-cancel"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          id="picker-confirm"
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Selecionar
        </button>
      </div>

      <Script>
        {() => {
          // @ts-ignore: DOM APIs available at runtime
          const doc = globalThis.document;
          if (!doc) return;

          // @ts-ignore: DOM APIs
          const grid = doc.getElementById("picker-grid");
          const mode = grid?.dataset?.mode ?? "single";
          const baseUrl = (grid?.dataset?.baseUrl ?? "").replace(/\/$/, "");

          let selected: string[] = [];

          function updateUI() {
            // @ts-ignore: DOM APIs
            doc.querySelectorAll("[data-media-item]").forEach(
              (el: any) => {
                const fn = el.dataset.mediaItem ?? "";
                if (selected.includes(fn)) {
                  el.classList.add(
                    "ring-2",
                    "ring-indigo-500",
                    "ring-offset-2",
                  );
                } else {
                  el.classList.remove(
                    "ring-2",
                    "ring-indigo-500",
                    "ring-offset-2",
                  );
                }
              },
            );
          }

          // @ts-ignore: DOM APIs
          doc.addEventListener("click", (e: MouseEvent) => {
            // @ts-ignore: DOM APIs
            const item = (e.target as HTMLElement)?.closest?.(
              "[data-media-item]",
            ) as any;
            if (!item) return;
            const fn = item.dataset.mediaItem ?? "";
            if (mode === "single") {
              selected = [fn];
            } else {
              const idx = selected.indexOf(fn);
              if (idx === -1) selected.push(fn);
              else selected.splice(idx, 1);
            }
            updateUI();
          });

          // @ts-ignore: DOM APIs
          doc.getElementById("picker-cancel")?.addEventListener(
            "click",
            () => {
              // @ts-ignore: DOM APIs
              globalThis.window.close();
            },
          );

          // @ts-ignore: DOM APIs
          doc.getElementById("picker-confirm")?.addEventListener(
            "click",
            () => {
              if (selected.length === 0) return;
              const urls = selected.map((fn) => `${baseUrl}/${fn}`);
              const result = mode === "single" ? urls[0] : urls;
              // @ts-ignore: DOM APIs
              const win = globalThis.window as any;
              if (win.opener && !win.opener.closed) {
                win.opener.postMessage(
                  { type: "media-picker-result", value: result },
                  win.location.origin,
                );
                win.close();
              } else {
                win.parent.postMessage(
                  { type: "media-picker-result", value: result },
                  win.location.origin,
                );
              }
            },
          );
        }}
      </Script>
    </div>
  );
}
