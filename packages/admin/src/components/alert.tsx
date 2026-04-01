export interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  dismissible?: boolean;
}

const typeClasses = {
  success: {
    bg: "bg-green-50",
    title: "text-green-800",
    message: "text-green-700",
    icon: "text-green-400",
    dismiss:
      "text-green-500 hover:bg-green-100 focus-visible:outline-green-600",
  },
  error: {
    bg: "bg-red-50",
    title: "text-red-800",
    message: "text-red-700",
    icon: "text-red-400",
    dismiss: "text-red-500 hover:bg-red-100 focus-visible:outline-red-600",
  },
  warning: {
    bg: "bg-yellow-50",
    title: "text-yellow-800",
    message: "text-yellow-700",
    icon: "text-yellow-400",
    dismiss:
      "text-yellow-500 hover:bg-yellow-100 focus-visible:outline-yellow-600",
  },
  info: {
    bg: "bg-blue-50",
    title: "text-blue-800",
    message: "text-blue-700",
    icon: "text-blue-400",
    dismiss: "text-blue-500 hover:bg-blue-100 focus-visible:outline-blue-600",
  },
};

export function Alert({
  type,
  title,
  message,
  dismissible = true,
}: AlertProps) {
  const c = typeClasses[type];
  return (
    <div role="alert" className={`rounded-md ${c.bg} p-4 mb-6`}>
      <div className="flex">
        <div className="shrink-0">
          <svg
            aria-hidden="true"
            className={`size-5 ${c.icon}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            {type === "success" || type === "info"
              ? (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              )
              : (
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              )}
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${c.title}`}>{title}</h3>
          {message && <p className={`mt-1 text-sm ${c.message}`}>{message}</p>}
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              data-dismiss-alert=""
              className={`-m-1.5 inline-flex rounded-md p-1.5 ${c.dismiss} focus-visible:outline-2 focus-visible:outline-offset-2`}
              aria-label="Dismiss"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
