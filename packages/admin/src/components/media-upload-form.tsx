export interface MediaUploadFormProps {
  csrfToken?: string;
  error?: string;
}

export function MediaUploadForm({ csrfToken, error }: MediaUploadFormProps) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Upload de Imagem</h1>
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
            <input
              id="file"
              type="file"
              name="file"
              accept="image/*"
              required
              className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 focus:outline-none"
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
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
