import { Breadcrumb } from "./breadcrumb.tsx";
import { Alert } from "./alert.tsx";
import { Button } from "./button.tsx";

export interface MatrixRole {
  slug: string;
  name: string;
}

export interface MatrixData {
  roles: MatrixRole[];
  resources: string[];
  permissions: Record<string, Record<string, string[]>>;
}

export interface PermissionsMatrixProps {
  matrix: MatrixData;
  success?: string;
  error?: string;
  csrfToken?: string;
}

const ACTIONS = ["read", "create", "update", "delete"] as const;

const actionLabels: Record<string, string> = {
  read: "R",
  create: "C",
  update: "U",
  delete: "D",
};

export function PermissionsMatrix({
  matrix,
  success,
  error,
  csrfToken,
}: PermissionsMatrixProps) {
  const { roles, resources, permissions } = matrix;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Roles", href: "/admin/plugins/role-plugin" },
          { label: "Permissions Matrix" },
        ]}
      />
      {success && <Alert type="success" title={success} />}
      {error && <Alert type="error" title={error} />}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold text-gray-900">
              Permissions Matrix
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Configure which actions each role can perform on each resource.
              R=Read, C=Create, U=Update, D=Delete.
            </p>
          </div>
        </div>
        <form
          method="POST"
          action="/admin/roles/permissions"
          className="mt-8"
        >
          {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg">
                <table
                  className="min-w-full divide-y divide-gray-300"
                  aria-label="Permissions matrix"
                >
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="pl-4 pr-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        Role
                      </th>
                      {resources.map((resource) => (
                        <th
                          key={resource}
                          scope="col"
                          className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900"
                        >
                          {resource}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {roles.map((role) => {
                      const rolePerms = permissions[role.slug] ?? {};
                      return (
                        <tr key={role.slug} className="hover:bg-gray-50">
                          <td className="pl-4 pr-3 py-4 text-sm font-medium text-gray-900 whitespace-nowrap sm:pl-6">
                            {role.name}
                          </td>
                          {resources.map((resource) => {
                            const currentPerms = rolePerms[resource] ?? [];
                            return (
                              <td
                                key={resource}
                                className="px-3 py-4 text-center"
                              >
                                <div className="flex justify-center gap-2">
                                  {ACTIONS.map((action) => {
                                    const fieldName =
                                      `perm_${role.slug}_${resource}_${action}`;
                                    const checked = currentPerms.includes(
                                      action,
                                    );
                                    return (
                                      <label
                                        key={action}
                                        className="flex flex-col items-center gap-0.5"
                                        title={`${action} permission for ${role.name} on ${resource}`}
                                      >
                                        <input
                                          type="checkbox"
                                          name={fieldName}
                                          value="1"
                                          defaultChecked={checked}
                                          className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                        <span className="text-xs text-gray-500">
                                          {actionLabels[action]}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-x-3 pt-6">
            <Button variant="secondary" href="/admin/plugins/role-plugin">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Permissions
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
