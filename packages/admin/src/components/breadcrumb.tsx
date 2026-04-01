export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex mb-6">
      <ol role="list" className="flex items-center space-x-2">
        <li>
          <div>
            <a
              href="/admin"
              className="text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded"
            >
              <svg
                aria-hidden="true"
                className="size-5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>
        {items.map((item, i) => (
          <li key={i}>
            <div className="flex items-center">
              <svg
                aria-hidden="true"
                className="size-5 shrink-0 text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448Z" />
              </svg>
              {item.href
                ? (
                  <a
                    href={item.href}
                    className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded"
                  >
                    {item.label}
                  </a>
                )
                : (
                  <span
                    aria-current="page"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    {item.label}
                  </span>
                )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
