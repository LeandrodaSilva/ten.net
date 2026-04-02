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
  { items, page, totalPages, search, csrfToken: _csrfToken }: MediaLibraryProps,
) {
  const separator = search ? `&` : `?`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-x-4">
        <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>
        <a
          href="/admin/media/upload"
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <svg
            aria-hidden="true"
            className="-ml-0.5 mr-1.5 size-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Upload
        </a>
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
                <div className="p-3">
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
              </li>
            ))}
          </ul>
        )}

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
                    ? `/admin/media?${search ? `search=${encodeURIComponent(search)}${separator}` : ""}page=${page - 1}`
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
                    ? `/admin/media?${search ? `search=${encodeURIComponent(search)}${separator}` : ""}page=${page + 1}`
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
                  href={`/admin/media?${search ? `search=${encodeURIComponent(search)}&` : ""}page=${page - 1}`}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Anterior
                </a>
              )
              : <span />}
            {page < totalPages && (
              <a
                href={`/admin/media?${search ? `search=${encodeURIComponent(search)}&` : ""}page=${page + 1}`}
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
