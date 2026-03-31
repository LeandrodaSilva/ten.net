import type { WidgetDefinition } from "../../widgets/types.ts";

export interface WidgetPaletteProps {
  availableWidgets: WidgetDefinition[];
}

export function WidgetPalette({ availableWidgets }: WidgetPaletteProps) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Widgets</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Clique para adicionar ao canvas
        </p>
      </div>
      <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {availableWidgets.map((widget) => (
          <li key={widget.type}>
            <button
              type="button"
              data-add-widget
              data-widget-type={widget.type}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:outline-none transition-colors"
            >
              {widget.icon && (
                <span
                  className="text-lg leading-none shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  {widget.icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  {widget.label}
                  {widget.restricted && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      Restrito
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                  {widget.description}
                </p>
              </div>
              <svg
                aria-hidden="true"
                className="size-4 text-indigo-400 shrink-0 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
