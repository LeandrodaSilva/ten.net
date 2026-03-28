import { Breadcrumb } from "./breadcrumb.tsx";
import { Alert } from "./alert.tsx";
import { DataTable } from "./data-table.tsx";
import type { DataTableAction, DataTableColumn } from "./data-table.tsx";
import { Pagination } from "./pagination.tsx";
import { Script } from "./script.tsx";

export interface CrudListProps {
  pluginName: string;
  pluginSlug: string;
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  success?: string;
  error?: string;
  csrfToken?: string;
}

export function CrudList({
  pluginName,
  pluginSlug,
  columns,
  rows,
  total,
  page,
  totalPages,
  success,
  error,
  csrfToken,
}: CrudListProps) {
  const basePath = `/admin/plugins/${pluginSlug}`;

  const actions: DataTableAction[] = [
    {
      label: "Edit",
      href: (row) => `${basePath}/${row.id}`,
    },
    {
      label: "Delete",
      href: (row) => `${basePath}/${row.id}/delete`,
      variant: "danger",
      confirmMessage: (row) =>
        `Delete "${
          row[columns[0]?.key] ?? "this item"
        }"? This cannot be undone.`,
    },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: pluginName }]} />
      {success && (
        <Alert type="success" title={`Item ${success} successfully`} />
      )}
      {error && <Alert type="error" title={error} />}
      <DataTable
        title={pluginName}
        description={`Manage all ${pluginName.toLowerCase()}.`}
        columns={columns}
        rows={rows}
        actions={actions}
        createHref={`${basePath}/new`}
        createLabel={`Add ${pluginName.toLowerCase().replace(/s$/, "")}`}
        emptyTitle={`No ${pluginName.toLowerCase()}`}
        emptyDescription={`Get started by creating your first ${
          pluginName.toLowerCase().replace(/s$/, "")
        }.`}
        csrfToken={csrfToken}
      />
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
