import type { MediaItem } from "./media-library.tsx";
import { Script } from "./script.tsx";

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
              (el: HTMLElement) => {
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
            const item = (e.target as HTMLElement)?.closest?.(
              "[data-media-item]",
            ) as HTMLElement | null;
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
              const win = globalThis.window;
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
