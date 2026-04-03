import { Breadcrumb } from "./breadcrumb.tsx";
import { Alert } from "./alert.tsx";
import { FormField } from "./form-field.tsx";
import type { FormFieldProps } from "./form-field.tsx";
import { Button } from "./button.tsx";
import { Script } from "./script.tsx";

export interface CrudFormProps {
  pluginName: string;
  pluginSlug: string;
  fields: Omit<FormFieldProps, "error">[];
  values?: Record<string, string>;
  errors?: Record<string, string>;
  action: string;
  isEdit?: boolean;
  csrfToken?: string;
  itemId?: string;
}

export function CrudForm({
  pluginName,
  pluginSlug,
  fields,
  values = {},
  errors = {},
  action,
  isEdit = false,
  csrfToken,
  itemId,
}: CrudFormProps) {
  const basePath = `/admin/plugins/${pluginSlug}`;
  const breadcrumbItems = [
    { label: pluginName, href: basePath },
    { label: isEdit ? `Edit` : "New" },
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      {Object.keys(errors).length > 0 && (
        <Alert type="error" title="Please fix the errors below." />
      )}
      <div className="mx-auto max-w-2xl">
        <form method="POST" action={action} className="space-y-6">
          {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
          {isEdit && itemId && (
            <input type="hidden" name="_method" value="PUT" />
          )}
          {fields.map((field) => (
            <FormField
              key={field.name}
              {...field}
              value={values[field.name] ?? field.value}
              error={errors[field.name]}
            />
          ))}
          <div className="flex items-center justify-end gap-x-3 pt-4">
            <Button variant="secondary" href={basePath}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
      <Script>
        {() => {
          // @ts-ignore: DOM APIs available at runtime in browser
          const doc = globalThis.document;
          if (doc) {
            const titleInput = doc.getElementById("title");
            const slugInput = doc.getElementById("slug");
            if (titleInput && slugInput) {
              let slugManuallyEdited = slugInput.value.trim() !== "";

              slugInput.addEventListener("input", () => {
                slugManuallyEdited = true;
              });

              titleInput.addEventListener("input", () => {
                if (!slugManuallyEdited) {
                  const text = titleInput.value;
                  slugInput.value = String(text)
                    .trim()
                    .replace(/([a-z])([A-Z])/g, "$1-$2")
                    .replace(/[\s_]+/g, "-")
                    .replace(/[^a-zA-Z0-9-]/g, "-")
                    .replace(/--+/g, "-")
                    .replace(/^-+|-+$/g, "")
                    .toLowerCase();
                }
              });
            }
          }
        }}
      </Script>
    </>
  );
}
