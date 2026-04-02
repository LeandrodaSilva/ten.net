import { Script } from "./script.tsx";

export interface MediaUploadFormProps {
  csrfToken?: string;
  error?: string;
}

export function MediaUploadForm({ csrfToken, error }: MediaUploadFormProps) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Upload de Imagem
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie uma imagem para a biblioteca de mídia.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form
        id="upload-form"
        method="POST"
        action="/admin/media/upload"
        encType="multipart/form-data"
        className="space-y-5"
      >
        {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}

        <div>
          <label
            htmlFor="file"
            className="block text-sm font-medium text-gray-900"
          >
            Arquivo <span className="text-red-500">*</span>
          </label>
          <div className="mt-2">
            <div
              id="upload-dropzone"
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            >
              <svg
                aria-hidden="true"
                className="mx-auto size-8 text-gray-400"
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
              <p className="mt-2 text-sm text-gray-600">
                Arraste imagens aqui ou{" "}
                <span className="text-indigo-600 font-medium">
                  clique para selecionar
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PNG, JPG, GIF, WEBP até 5 MB
              </p>
              <input
                id="file"
                type="file"
                name="file"
                accept="image/*"
                required
                className="hidden"
              />
            </div>
            <p
              id="upload-error"
              className="hidden mt-2 text-sm text-red-600"
            />
            <p
              id="upload-filename"
              className="hidden mt-2 text-sm text-gray-700"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="alt"
            className="block text-sm font-medium text-gray-900"
          >
            Alt text
          </label>
          <div className="mt-2">
            <input
              id="alt"
              type="text"
              name="alt"
              placeholder="Alt text (opcional)"
              className="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-x-3 pt-2">
          <a
            href="/admin/media"
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
          >
            Cancelar
          </a>
          <button
            id="upload-submit"
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Enviar
          </button>
        </div>
      </form>

      <Script>
        {() => {
          // @ts-ignore: DOM APIs available at runtime
          const doc = globalThis.document;
          if (!doc) return;

          // @ts-ignore: DOM APIs
          const dropzone = doc.getElementById("upload-dropzone") as any;
          // @ts-ignore: DOM APIs
          const fileInput = doc.getElementById("file") as any;
          // @ts-ignore: DOM APIs
          const errorEl = doc.getElementById("upload-error") as any;
          // @ts-ignore: DOM APIs
          const filenameEl = doc.getElementById("upload-filename") as any;
          // @ts-ignore: DOM APIs
          const submitBtn = doc.getElementById("upload-submit") as any;

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

          function validateAndShowFile(file: File) {
            clearError();
            if (!file.type.startsWith("image/")) {
              showError("Apenas imagens são permitidas (PNG, JPG, GIF, WEBP).");
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
              validateAndShowFile(files[0]);
            });

            fileInput.addEventListener("change", () => {
              const files = fileInput.files;
              if (files?.length) validateAndShowFile(files[0]);
            });
          }

          // Client-side validation on submit
          // @ts-ignore: DOM APIs
          const form = doc.getElementById("upload-form") as any;
          if (form) {
            // @ts-ignore: DOM APIs
            form.addEventListener("submit", (e: Event) => {
              const files = fileInput?.files;
              if (!files?.length) {
                e.preventDefault();
                showError("Selecione um arquivo de imagem.");
                return;
              }
              if (!validateAndShowFile(files[0])) {
                e.preventDefault();
              }
            });
          }
        }}
      </Script>
    </div>
  );
}
