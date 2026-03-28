import { EmptyState } from "./empty-state.tsx";

export interface DataTableColumn {
  key: string;
  label: string;
}

export interface DataTableAction {
  label: string;
  href: (row: Record<string, unknown>) => string;
  variant?: "default" | "danger";
  confirmMessage?: (row: Record<string, unknown>) => string;
}

export interface DataTableProps {
  title: string;
  description: string;
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  actions?: DataTableAction[];
  createHref?: string;
  createLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable({
  title,
  description,
  columns,
  rows,
  actions,
  createHref,
  createLabel = "Add new",
  emptyTitle = "No items",
  emptyDescription = "Get started by creating a new item.",
}: DataTableProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-700">{description}</p>
        </div>
        {createHref && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <a
              href={createHref}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {createLabel}
            </a>
          </div>
        )}
      </div>
      <div className="mt-8 flow-root">
        {rows.length === 0
          ? (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={createLabel}
              actionHref={createHref}
            />
          )
          : (
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg">
                  <table
                    className="min-w-full divide-y divide-gray-300"
                    aria-label={`${title} list`}
                  >
                    <thead className="bg-gray-50">
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 first:pl-4 first:sm:pl-6"
                          >
                            {col.label}
                          </th>
                        ))}
                        {actions && actions.length > 0 && (
                          <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {rows.map((row, rowIndex) => (
                        <tr
                          key={String(row.id ?? rowIndex)}
                          className="hover:bg-gray-50"
                        >
                          {columns.map((col, colIndex) => (
                            <td
                              key={col.key}
                              className={`px-3 py-4 text-sm whitespace-nowrap ${
                                colIndex === 0
                                  ? "font-medium text-gray-900 pl-4 sm:pl-6"
                                  : "text-gray-500"
                              }`}
                            >
                              {String(row[col.key] ?? "")}
                            </td>
                          ))}
                          {actions && actions.length > 0 && (
                            <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                              {actions.map((action, ai) => {
                                const href = action.href(row);
                                if (action.variant === "danger") {
                                  return (
                                    <form
                                      key={ai}
                                      method="POST"
                                      action={href}
                                      className="inline ml-4"
                                    >
                                      <button
                                        type="submit"
                                        data-confirm={action.confirmMessage
                                          ? action.confirmMessage(row)
                                          : "Are you sure?"}
                                        className="text-red-600 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                      >
                                        {action.label}
                                        <span className="sr-only">
                                          , {String(row[columns[0]?.key] ?? "")}
                                        </span>
                                      </button>
                                    </form>
                                  );
                                }
                                return (
                                  <a
                                    key={ai}
                                    href={href}
                                    className="text-indigo-600 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ml-4 first:ml-0"
                                  >
                                    {action.label}
                                    <span className="sr-only">
                                      , {String(row[columns[0]?.key] ?? "")}
                                    </span>
                                  </a>
                                );
                              })}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
