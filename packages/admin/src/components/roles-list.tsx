import { Breadcrumb } from "./breadcrumb.tsx";
import { Alert } from "./alert.tsx";
import { Pagination } from "./pagination.tsx";
import { Script } from "./script.tsx";

export interface RolesListProps {
  pluginName: string;
  pluginSlug: string;
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  success?: string;
  error?: string;
  csrfToken?: string;
}

export function RolesList({
  pluginName,
  pluginSlug,
  rows,
  total,
  page,
  totalPages,
  success,
  error,
  csrfToken,
}: RolesListProps) {
  const basePath = `/admin/plugins/${pluginSlug}`;

  return (
    <>
      <Breadcrumb items={[{ label: pluginName }]} />
      {success && (
        <Alert type="success" title={`Role ${success} successfully`} />
      )}
      {error && <Alert type="error" title={error} />}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold text-gray-900">
              {pluginName}
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage user roles and access control.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-3">
            <a
              href="/admin/roles/permissions"
              className="block rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Permissions Matrix
            </a>
            <a
              href={`${basePath}/new`}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Add role
            </a>
          </div>
        </div>
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
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 0 1 3 17.208V5.792A2 2 0 0 1 5.228 3.872h13.544A2 2 0 0 1 21 5.792v4.028m-6-2.82a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No roles
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first role.
                </p>
              </div>
            )
            : (
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg">
                    <table
                      className="min-w-full divide-y divide-gray-300"
                      aria-label="Roles list"
                    >
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="pl-4 pr-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >
                            Name
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Slug
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Description
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Type
                          </th>
                          <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {rows.map((row, i) => {
                          const isSystem = row.is_system === "true" ||
                            row.is_system === true;
                          return (
                            <tr
                              key={String(row.id ?? i)}
                              className="hover:bg-gray-50"
                            >
                              <td className="pl-4 pr-3 py-4 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                                {String(row.name ?? "")}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                  {String(row.slug ?? "")}
                                </code>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500">
                                {String(row.description ?? "")}
                              </td>
                              <td className="px-3 py-4 text-sm whitespace-nowrap">
                                {isSystem
                                  ? (
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
                                      System
                                    </span>
                                  )
                                  : (
                                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset">
                                      Custom
                                    </span>
                                  )}
                              </td>
                              <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                                <a
                                  href={`${basePath}/${row.id}`}
                                  className="text-indigo-600 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                >
                                  Edit
                                  <span className="sr-only">
                                    , {String(row.name ?? "")}
                                  </span>
                                </a>
                                {isSystem
                                  ? (
                                    <span
                                      className="ml-4 text-gray-300 cursor-not-allowed"
                                      title="System roles cannot be deleted"
                                    >
                                      Delete
                                    </span>
                                  )
                                  : (
                                    <form
                                      method="POST"
                                      action={`${basePath}/${row.id}/delete`}
                                      className="inline ml-4"
                                    >
                                      {csrfToken && (
                                        <input
                                          type="hidden"
                                          name="_csrf"
                                          value={csrfToken}
                                        />
                                      )}
                                      <button
                                        type="submit"
                                        data-confirm={`Delete role "${
                                          row.name ?? "this role"
                                        }"? This cannot be undone.`}
                                        className="text-red-600 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                      >
                                        Delete
                                        <span className="sr-only">
                                          , {String(row.name ?? "")}
                                        </span>
                                      </button>
                                    </form>
                                  )}
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
      <Script>
        {() => {
          // @ts-ignore: DOM APIs available at runtime in browser
          const doc = globalThis.document;
          if (!doc) return;
        }}
      </Script>
    </>
  );
}
