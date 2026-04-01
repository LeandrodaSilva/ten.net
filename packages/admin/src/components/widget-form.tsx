import type {
  WidgetDefinition,
  WidgetFieldSchema,
  WidgetInstance,
} from "@leproj/tennet-widgets";

const baseInputClass =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm";

function resolveFieldValue(
  field: WidgetFieldSchema,
  values?: Record<string, unknown>,
): string {
  if (values && field.name in values) {
    return String(values[field.name] ?? "");
  }
  if (field.default !== undefined) {
    return String(field.default);
  }
  return "";
}

function WidgetField(
  { field, values }: {
    field: WidgetFieldSchema;
    values?: Record<string, unknown>;
  },
) {
  const inputName = `data.${field.name}`;
  const value = resolveFieldValue(field, values);

  return (
    <div>
      <label
        htmlFor={inputName}
        className="block text-sm font-medium text-gray-900"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-2">
        {field.type === "textarea" && (
          <textarea
            id={inputName}
            name={inputName}
            rows={4}
            defaultValue={value}
            required={field.required}
            className={baseInputClass}
          />
        )}
        {field.type === "rich-text" && (
          <textarea
            id={inputName}
            name={inputName}
            rows={6}
            defaultValue={value}
            required={field.required}
            className={`${baseInputClass} widget-rich-text`}
          />
        )}
        {field.type === "select" && (
          <select
            id={inputName}
            name={inputName}
            defaultValue={value}
            required={field.required}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        {field.type === "image" && (
          <input
            type="url"
            id={inputName}
            name={inputName}
            defaultValue={value}
            required={field.required}
            placeholder="Image URL"
            className={baseInputClass}
          />
        )}
        {field.type === "url" && (
          <input
            type="url"
            id={inputName}
            name={inputName}
            defaultValue={value}
            required={field.required}
            className={baseInputClass}
          />
        )}
        {field.type === "number" && (
          <input
            type="number"
            id={inputName}
            name={inputName}
            defaultValue={value}
            required={field.required}
            className={baseInputClass}
          />
        )}
        {field.type === "text" && (
          <input
            type="text"
            id={inputName}
            name={inputName}
            defaultValue={value}
            required={field.required}
            className={baseInputClass}
          />
        )}
      </div>
    </div>
  );
}

export interface WidgetFormProps {
  widgetDefinition: WidgetDefinition;
  values?: Record<string, unknown>;
}

export function WidgetForm({ widgetDefinition, values }: WidgetFormProps) {
  return (
    <div className="space-y-6">
      {widgetDefinition.fields.map((field) => (
        <WidgetField key={field.name} field={field} values={values} />
      ))}
    </div>
  );
}

export interface WidgetTypeSelectorProps {
  availableWidgets: WidgetDefinition[];
  selectedType?: string;
}

export function WidgetTypeSelector(
  { availableWidgets, selectedType }: WidgetTypeSelectorProps,
) {
  return (
    <div>
      <label htmlFor="type" className="block text-sm font-medium text-gray-900">
        Widget Type
        <span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="mt-2">
        <select
          id="type"
          name="type"
          defaultValue={selectedType ?? ""}
          required
          className={baseInputClass}
        >
          <option value="">Select a widget type...</option>
          {availableWidgets.map((widget) => (
            <option key={widget.type} value={widget.type}>
              {widget.icon ? `${widget.icon} ${widget.label}` : widget.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export interface WidgetCardProps {
  widget: WidgetInstance;
  definition: WidgetDefinition | null;
  editHref: string;
  deleteAction: string;
  csrfToken?: string;
}

export function WidgetCard(
  { widget, definition, editHref, deleteAction, csrfToken }: WidgetCardProps,
) {
  const label = definition
    ? (definition.icon
      ? `${definition.icon} ${definition.label}`
      : definition.label)
    : widget.type;

  const dataSummary = Object.entries(widget.data)
    .slice(0, 2)
    .map(([k, v]) => {
      const strVal = String(v ?? "");
      return `${k}: ${
        strVal.length > 30 ? strVal.slice(0, 30) + "..." : strVal
      }`;
    })
    .join(" · ");

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-xs">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        {dataSummary && (
          <p className="mt-0.5 text-xs text-gray-500 truncate">{dataSummary}</p>
        )}
      </div>
      <div className="ml-4 flex items-center gap-x-2 shrink-0">
        <a
          href={editHref}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Edit
          <span className="sr-only">, {label}</span>
        </a>
        <form method="POST" action={deleteAction} className="inline">
          {csrfToken && <input type="hidden" name="_csrf" value={csrfToken} />}
          <button
            type="submit"
            data-confirm={`Delete widget "${label}"?`}
            className="text-sm font-medium text-red-600 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Delete
            <span className="sr-only">, {label}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
