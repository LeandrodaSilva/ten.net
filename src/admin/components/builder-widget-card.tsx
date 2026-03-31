import type { WidgetDefinition, WidgetInstance } from "../../widgets/types.ts";

export interface BuilderWidgetCardProps {
  widget: WidgetInstance;
  definition: WidgetDefinition | null;
}

export function BuilderWidgetCard(
  { widget, definition }: BuilderWidgetCardProps,
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
      return `${k}: ${strVal.length > 40 ? strVal.slice(0, 40) + "…" : strVal}`;
    })
    .join(" · ");

  return (
    <div
      data-widget-id={widget.id}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-xs select-none"
    >
      <span
        data-drag-handle
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0"
        title="Arraste para reordenar"
        aria-hidden="true"
      >
        <svg
          className="size-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2Zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8Zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14Zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6Zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8Zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14Z" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        {dataSummary && (
          <p className="mt-0.5 text-xs text-gray-500 truncate">{dataSummary}</p>
        )}
      </div>

      <div className="ml-2 flex items-center gap-x-2 shrink-0">
        <button
          type="button"
          data-edit-widget={widget.id}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded"
        >
          Editar
          <span className="sr-only">, {label}</span>
        </button>
        <button
          type="button"
          data-duplicate-widget={widget.id}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Duplicar
        </button>
        <button
          type="button"
          data-delete-widget={widget.id}
          className="text-sm font-medium text-red-600 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 rounded"
        >
          Excluir
          <span className="sr-only">, {label}</span>
        </button>
      </div>
    </div>
  );
}
