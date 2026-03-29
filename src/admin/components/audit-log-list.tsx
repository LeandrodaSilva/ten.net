import { Breadcrumb } from "./breadcrumb.tsx";
import { Alert } from "./alert.tsx";
import { Pagination } from "./pagination.tsx";

export interface AuditLogListProps {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
  filterAction?: string;
  filterResource?: string;
  resources?: string[];
}

const actionBadgeClasses: Record<string, string> = {
  create: "bg-green-50 text-green-700 ring-green-600/20",
  update: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  delete: "bg-red-50 text-red-700 ring-red-600/20",
};

function formatTimestamp(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogList({
  rows,
  total,
  page,
  totalPages,
  error,
  filterAction,
  filterResource,
  resources = [],
}: AuditLogListProps) {
  const basePath = "/admin/plugins/audit-log-plugin";

  return (
    <>
      <Breadcrumb items={[{ label: "Audit Log" }]} />
      {error && <Alert type="error" title={error} />}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold text-gray-900">
              Audit Log
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              A record of all admin actions. Entries are automatically removed
              after 90 days.
            </p>
          </div>
        </div>

        {/* Filters */}
        <form
          method="GET"
          action={basePath}
          className="mt-4 flex gap-3 items-end"
        >
          <div>
            <label
              htmlFor="filter-action"
              className="block text-sm font-medium text-gray-700"
            >
              Action
            </label>
            <select
              id="filter-action"
              name="action"
              defaultValue={filterAction ?? ""}
              className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            >
              <option value="">All</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="filter-resource"
              className="block text-sm font-medium text-gray-700"
            >
              Resource
            </label>
            <select
              id="filter-resource"
              name="resource"
              defaultValue={filterResource ?? ""}
              className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            >
              <option value="">All</option>
              {resources.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
          >
            Filter
          </button>
        </form>

        <div className="mt-8 flow-root">
          {rows.length === 0
            ? (
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
                  No audit log entries
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Activity will appear here as changes are made in the admin
                  panel.
                </p>
              </div>
            )
            : (
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg">
                    <table
                      className="min-w-full divide-y divide-gray-300"
                      aria-label="Audit log"
                    >
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="pl-4 pr-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >
                            Timestamp
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            User
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Action
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Resource
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Resource ID
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {rows.map((row, i) => {
                          const action = String(row.action ?? "");
                          const badgeClass = actionBadgeClasses[action] ??
                            "bg-gray-50 text-gray-600 ring-gray-500/10";
                          const details = String(row.details ?? "");
                          return (
                            <tr
                              key={String(row.id ?? i)}
                              className="hover:bg-gray-50"
                            >
                              <td className="pl-4 pr-3 py-4 text-sm text-gray-500 whitespace-nowrap sm:pl-6">
                                {formatTimestamp(
                                  String(row.timestamp ?? ""),
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                {String(row.username ?? "")}
                              </td>
                              <td className="px-3 py-4 text-sm whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
                                >
                                  {action}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {String(row.resource ?? "")}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                  {String(row.resource_id ?? "").substring(
                                    0,
                                    8,
                                  )}
                                </code>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                                {details
                                  ? (
                                    <details className="inline">
                                      <summary className="cursor-pointer text-indigo-600 hover:text-indigo-900">
                                        View
                                      </summary>
                                      <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                        {details}
                                      </pre>
                                    </details>
                                  )
                                  : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={20}
          baseHref={basePath}
        />
      )}
    </>
  );
}
