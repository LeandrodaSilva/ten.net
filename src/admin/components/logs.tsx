export interface AuditLogEntry {
  action: string;
  resource: string;
  resource_id: string;
  username: string;
  timestamp: string;
  details?: string;
}

export interface LogsProps {
  entries?: AuditLogEntry[];
}

const actionIcons: Record<string, { path: string; color: string }> = {
  create: {
    path: "M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    color: "text-green-500",
  },
  update: {
    path:
      "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
    color: "text-yellow-500",
  },
  delete: {
    path:
      "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0",
    color: "text-red-500",
  },
};

function relativeTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Logs({ entries }: LogsProps) {
  if (!entries || entries.length === 0) {
    return (
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
  }

  return (
    <ul role="list" className="divide-y divide-gray-100">
      {entries.map((entry, i) => {
        const icon = actionIcons[entry.action] ?? actionIcons.update;
        return (
          <li key={i} className="flex gap-x-4 py-3">
            <div className="flex-none">
              <svg
                aria-hidden="true"
                className={`size-5 ${icon.color}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={icon.path}
                />
              </svg>
            </div>
            <div className="min-w-0 flex-auto">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{entry.username}</span>{" "}
                <span className="text-gray-500">
                  {entry.action}d
                </span>{" "}
                <span className="text-gray-700">{entry.resource}</span>
              </p>
            </div>
            <div className="flex-none">
              <span className="text-xs text-gray-400">
                {relativeTime(entry.timestamp)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
