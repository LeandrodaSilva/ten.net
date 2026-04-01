import type { Plugin } from "@leproj/tennet";
import { CrudForm } from "../../components/crud-form.tsx";
import type { CrudFormProps } from "../../components/crud-form.tsx";
import { Button } from "../../components/button.tsx";
import type { FormFieldProps } from "../../components/form-field.tsx";
import type { SidebarNavItem } from "../../components/sidebar-nav.tsx";
import { PostsPlugin } from "../postsPlugin.ts";
import { UsersPlugin } from "../usersPlugin.ts";
import { CategoriesPlugin } from "../categoriesPlugin.ts";
import { RolesPlugin } from "../rolesPlugin.ts";

/** Map a model field type to a form field type. */
export function fieldType(type: string): FormFieldProps["type"] {
  switch (type) {
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

/** Get field-specific config for smart form rendering. */
export async function getFieldConfig(
  plugin: Plugin,
  plugins: Plugin[],
  fieldName: string,
  rawType: string,
): Promise<Partial<FormFieldProps>> {
  if (plugin instanceof PostsPlugin) {
    switch (fieldName) {
      case "body":
        return { type: "textarea", rows: 10 };
      case "excerpt":
        return { type: "textarea", rows: 3 };
      case "status":
        return {
          type: "select",
          options: [
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
          ],
        };
      case "category_ids": {
        const catPlugin = plugins.find((p) => p instanceof CategoriesPlugin);
        const options: { value: string; label: string }[] = [];
        if (catPlugin) {
          const categories = await catPlugin.storage.list({
            page: 1,
            limit: 100,
          });
          for (const cat of categories) {
            options.push({
              value: cat.id,
              label: String(cat.name ?? cat.id),
            });
          }
        }
        return { type: "select", multiple: true, options };
      }
      case "published_at":
        return {
          type: "text",
          readonly: true,
          hint: "Auto-filled on first publish",
        };
    }
  }
  if (plugin instanceof UsersPlugin) {
    switch (fieldName) {
      case "role_id": {
        const rolesPlugin = plugins.find((p) => p instanceof RolesPlugin);
        const options: { value: string; label: string }[] = [];
        if (rolesPlugin) {
          const roles = await rolesPlugin.storage.list({
            page: 1,
            limit: 100,
          });
          for (const role of roles) {
            options.push({
              value: role.id,
              label: String(role.name ?? role.id),
            });
          }
        }
        return { type: "select", options };
      }
      case "status":
        return {
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        };
    }
  }
  return { type: fieldType(rawType) };
}

/** Build form fields for a plugin using getFieldConfig. */
export async function buildFormFields(
  plugin: Plugin,
  plugins: Plugin[],
): Promise<Omit<FormFieldProps, "error">[]> {
  const fields: Omit<FormFieldProps, "error">[] = [];
  for (const [key, type] of Object.entries(plugin.model)) {
    const config = await getFieldConfig(plugin, plugins, key, type);
    fields.push({
      name: key,
      label: (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, " "),
      type: fieldType(type),
      required: type !== "boolean",
      ...config,
    });
  }
  return fields;
}

/** Build nav items from registered plugins. */
export function buildNavItems(
  plugins: Plugin[],
  activeSlug?: string,
): SidebarNavItem[] {
  const puzzleIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className="size-5 shrink-0 text-gray-400 group-hover:text-indigo-600"
    >
      <path
        d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return plugins.map((p) => ({
    label: p.name.replace("Plugin", ""),
    href: `/admin/plugins/${p.slug}`,
    icon: puzzleIcon,
    active: p.slug === activeSlug,
  }));
}

/** Edit form for PagePlugin — extends CrudForm with an optional Page Builder link. */
type PageEditProps = CrudFormProps & { builderHref?: string };
export function PagePluginEditPage(
  { builderHref, ...formProps }: PageEditProps,
) {
  return (
    <>
      <CrudForm {...(formProps as CrudFormProps)} />
      {builderHref && (
        <div className="mx-auto max-w-2xl flex justify-end pt-2">
          <Button variant="secondary" href={builderHref}>
            Page Builder
          </Button>
        </div>
      )}
    </>
  );
}
