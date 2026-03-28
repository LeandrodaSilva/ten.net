export const Logs = () => (
  <div className="text-center py-12">
    <svg
      aria-hidden="true"
      className="mx-auto size-12 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
    <h3 className="mt-2 text-sm font-semibold text-gray-900">
      No recent activity
    </h3>
    <p className="mt-1 text-sm text-gray-500">
      Activity will appear here as you use the admin panel.
    </p>
  </div>
);
