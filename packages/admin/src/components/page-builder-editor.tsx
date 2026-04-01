import type {
  PlaceholderMap,
  WidgetDefinition,
  WidgetInstance,
} from "@leproj/tennet-widgets";
import { Script } from "./script.tsx";
import { WidgetPalette } from "./widget-palette.tsx";
import { BuilderWidgetCard } from "./builder-widget-card.tsx";
import { WidgetForm } from "./widget-form.tsx";

export interface PageBuilderEditorProps {
  pageId: string;
  pageTitle: string;
  placeholders: PlaceholderMap;
  availableWidgets: WidgetDefinition[];
  /** Widget being edited, if any */
  editingWidget?: WidgetInstance;
  /** Definition for the widget being edited */
  editingDefinition?: WidgetDefinition;
  csrfToken?: string;
}

function PlaceholderSection(
  { name, widgets, definitions }: {
    name: string;
    widgets: WidgetInstance[];
    definitions: Map<string, WidgetDefinition>;
  },
) {
  return (
    <section className="mb-8">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {name}
      </h3>
      <div
        id={`widget-list-${name}`}
        data-placeholder={name}
        className="min-h-16 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-2 space-y-2 transition-colors"
      >
        {widgets.length === 0 && (
          <p className="flex items-center justify-center h-12 text-sm text-gray-400">
            Nenhum widget neste placeholder
          </p>
        )}
        {widgets.map((w) => (
          <BuilderWidgetCard
            key={w.id}
            widget={w}
            definition={definitions.get(w.type) ?? null}
          />
        ))}
      </div>
    </section>
  );
}

export function PageBuilderEditor(
  {
    pageId,
    pageTitle,
    placeholders,
    availableWidgets,
    editingWidget,
    editingDefinition,
    csrfToken,
  }: PageBuilderEditorProps,
) {
  const definitionMap = new Map(availableWidgets.map((d) => [d.type, d]));
  const placeholderNames = Object.keys(placeholders);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <a
            href={`/admin/plugins/page-plugin`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <svg
              aria-hidden="true"
              className="size-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            Voltar
          </a>
          <span className="text-gray-300" aria-hidden="true">/</span>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm"
          >
            <a
              href="/admin/plugins/page-plugin"
              className="text-gray-500 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded"
            >
              Páginas
            </a>
            <span className="text-gray-300" aria-hidden="true">/</span>
            <span className="font-medium text-gray-900">{pageTitle}</span>
            <span className="text-gray-300" aria-hidden="true">/</span>
            <span className="font-medium text-indigo-600">Builder</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-preview"
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            👁 Preview
          </button>
          <a
            href={`/admin/plugins/page-plugin/${pageId}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Configurações da página
          </a>
        </div>
      </header>

      {/* Body: 3 colunas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Coluna 1: Palette */}
        <WidgetPalette availableWidgets={availableWidgets} />

        {/* Coluna 2: Canvas */}
        <main
          id="builder-canvas"
          data-page-id={pageId}
          className="flex-1 overflow-y-auto p-6"
        >
          {placeholderNames.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-gray-500">
                  Nenhum placeholder encontrado nesta página.
                </p>
              </div>
            )
            : placeholderNames.map((name) => (
              <PlaceholderSection
                key={name}
                name={name}
                widgets={placeholders[name] ?? []}
                definitions={definitionMap}
              />
            ))}
        </main>

        {/* Coluna 3: Form de edição */}
        <aside className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">
              {editingWidget ? "Editar widget" : "Propriedades"}
            </h2>
          </div>

          {editingWidget && editingDefinition
            ? (
              <div className="flex-1 overflow-y-auto p-4">
                <form
                  method="POST"
                  action={`/admin/pages/${pageId}/widgets/${editingWidget.id}`}
                >
                  {csrfToken && (
                    <input type="hidden" name="_csrf" value={csrfToken} />
                  )}
                  <input
                    type="hidden"
                    name="_method"
                    value="PATCH"
                  />
                  <WidgetForm
                    widgetDefinition={editingDefinition}
                    values={editingWidget.data}
                  />
                  <div className="mt-6 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      Salvar
                    </button>
                    <a
                      href={`/admin/pages/${pageId}/builder`}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      Cancelar
                    </a>
                  </div>
                </form>
              </div>
            )
            : (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="text-sm text-gray-400">
                  Clique em "Editar" em um widget para configurar suas
                  propriedades.
                </p>
              </div>
            )}
        </aside>
      </div>

      {/* CSRF token para fetch requests */}
      <meta name="csrf-token" content={csrfToken ?? ""} />

      {/* Script: Sortable.js + add/delete listeners */}
      <Script>
        {() => {
          (function () {
            // @ts-ignore: DOM APIs available at runtime in browser
            const doc = globalThis.document;
            if (!doc) return;

            // Ler CSRF token do meta tag
            // @ts-ignore: querySelector
            const csrfMeta = doc.querySelector('meta[name="csrf-token"]');
            // @ts-ignore: content
            const csrf = csrfMeta ? csrfMeta.content : "";

            // @ts-ignore: Sortable loaded via CDN
            const SortableLib = globalThis.Sortable;

            // Inicializar Sortable em cada placeholder
            // @ts-ignore: querySelectorAll return
            const lists = doc.querySelectorAll("[data-placeholder]");
            // @ts-ignore: forEach
            lists.forEach((list) => {
              if (!SortableLib) return;
              // @ts-ignore: Sortable constructor
              new SortableLib(list, {
                handle: "[data-drag-handle]",
                animation: 150,
                ghostClass: "opacity-50",
                // @ts-ignore: SortableEvent
                onEnd: (evt) => {
                  // @ts-ignore: dataset
                  const placeholder = list.dataset.placeholder;
                  // @ts-ignore: children array
                  const cards = Array.from(
                    list.querySelectorAll("[data-widget-id]"),
                  );
                  // @ts-ignore: map
                  const order = cards.map((card, i) => ({
                    // @ts-ignore: dataset property
                    widgetId: card.dataset.widgetId,
                    order: i,
                  }));

                  // @ts-ignore: pageId from canvas
                  const canvas = doc.getElementById("builder-canvas");
                  // @ts-ignore: dataset
                  const pageId = canvas ? canvas.dataset.pageId : "";

                  if (!pageId || !placeholder) return;
                  // Validar pageId contra injeção em URL
                  if (!/^[\w-]+$/.test(pageId)) return;

                  fetch(`/admin/pages/${pageId}/widgets/reorder`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-CSRF-Token": csrf,
                    },
                    body: JSON.stringify(order),
                  }).then(() => {
                    refreshPreview();
                  }).catch(() => {
                    // Revert on failure: reload page
                    // @ts-ignore: location
                    globalThis.location.reload();
                  });

                  // Suppress unused variable warning
                  void evt;
                },
              });
            });

            // Listener: adicionar widget via palette
            // @ts-ignore: event delegation
            doc.addEventListener("click", (e) => {
              // @ts-ignore: closest
              const btn = e.target.closest("[data-add-widget]");
              if (!btn) return;

              // @ts-ignore: dataset
              const widgetType = btn.dataset.widgetType;
              // @ts-ignore: canvas
              const canvas = doc.getElementById("builder-canvas");
              // @ts-ignore: dataset
              const pageId = canvas ? canvas.dataset.pageId : "";
              if (!pageId || !widgetType) return;
              // Validar pageId contra injeção em URL
              if (!/^[\w-]+$/.test(pageId)) return;

              fetch(`/admin/pages/${pageId}/widgets`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-CSRF-Token": csrf,
                },
                body: JSON.stringify({ type: widgetType }),
              }).then(() => {
                // @ts-ignore: reload
                globalThis.location.reload();
                refreshPreview();
              }).catch(() => {
                // @ts-ignore: reload
                globalThis.location.reload();
              });
            });

            // Listener: deletar widget
            // @ts-ignore: event delegation
            doc.addEventListener("click", (e) => {
              // @ts-ignore: closest
              const btn = e.target.closest("[data-delete-widget]");
              if (!btn) return;

              // @ts-ignore: dataset
              const widgetId = btn.dataset.deleteWidget;
              // @ts-ignore: canvas
              const canvas = doc.getElementById("builder-canvas");
              // @ts-ignore: dataset
              const pageId = canvas ? canvas.dataset.pageId : "";
              if (!pageId || !widgetId) return;
              // Validar pageId e widgetId contra injeção em URL
              if (!/^[\w-]+$/.test(pageId)) return;
              if (!/^[\w-]+$/.test(widgetId)) return;

              // @ts-ignore: confirm
              if (!globalThis.confirm("Excluir este widget?")) return;

              fetch(`/admin/pages/${pageId}/widgets/${widgetId}/delete`, {
                method: "POST",
                headers: { "X-CSRF-Token": csrf },
              }).then(() => {
                // @ts-ignore: reload
                globalThis.location.reload();
                refreshPreview();
              }).catch(() => {
                // @ts-ignore: reload
                globalThis.location.reload();
              });
            });

            // Listener: duplicar widget
            // @ts-ignore: event delegation
            doc.addEventListener("click", (e) => {
              // @ts-ignore: closest
              const btn = e.target.closest("[data-duplicate-widget]");
              if (!btn) return;

              // @ts-ignore: dataset
              const widgetId = btn.dataset.duplicateWidget;
              // @ts-ignore: canvas
              const canvas = doc.getElementById("builder-canvas");
              // @ts-ignore: dataset
              const pageId = canvas ? canvas.dataset.pageId : "";
              if (!pageId || !widgetId) return;
              if (!/^[\w-]+$/.test(pageId)) return;
              if (!/^[\w-]+$/.test(widgetId)) return;
              fetch(`/admin/pages/${pageId}/widgets/${widgetId}/duplicate`, {
                method: "POST",
                headers: { "X-CSRF-Token": csrf },
              }).then(() => {
                globalThis.location.reload();
              })
                .catch(() => {
                  globalThis.location.reload();
                });
            });

            // Listener: editar widget (navega para URL de edição inline)
            // @ts-ignore: event delegation
            doc.addEventListener("click", (e) => {
              // @ts-ignore: closest
              const btn = e.target.closest("[data-edit-widget]");
              if (!btn) return;

              // @ts-ignore: dataset
              const widgetId = btn.dataset.editWidget;
              // @ts-ignore: canvas
              const canvas = doc.getElementById("builder-canvas");
              // @ts-ignore: dataset
              const pageId = canvas ? canvas.dataset.pageId : "";
              if (!pageId || !widgetId) return;
              // Validar pageId e widgetId contra injeção em URL
              if (!/^[\w-]+$/.test(pageId)) return;
              if (!/^[\w-]+$/.test(widgetId)) return;

              // @ts-ignore: location
              globalThis.location.href =
                `/admin/pages/${pageId}/builder?edit=${widgetId}`;
            });

            // Preview modal
            // @ts-ignore: getElementById
            const previewModal = doc.getElementById("preview-modal");
            // @ts-ignore: getElementById
            const previewIframe = doc.getElementById("preview-iframe");
            // @ts-ignore: getElementById
            const btnPreview = doc.getElementById("btn-preview");
            // @ts-ignore: getElementById
            const btnClose = doc.getElementById("preview-close");

            function refreshPreview() {
              // @ts-ignore: classList / src
              if (
                previewModal && !previewModal.classList.contains("hidden") &&
                previewIframe
              ) {
                // @ts-ignore: src
                const currentSrc = previewIframe.src;
                previewIframe.setAttribute("src", currentSrc);
              }
            }

            if (btnPreview && previewModal) {
              btnPreview.addEventListener("click", () => {
                // @ts-ignore: classList
                previewModal.classList.remove("hidden");
                refreshPreview();
              });
            }
            if (btnClose && previewModal) {
              btnClose.addEventListener("click", () => {
                // @ts-ignore: classList
                previewModal.classList.add("hidden");
              });
            }

            // Toggle responsivo
            // @ts-ignore: record
            const WIDTHS = {
              desktop: "100%",
              tablet: "768px",
              mobile: "375px",
            };
            ["desktop", "tablet", "mobile"].forEach((mode) => {
              // @ts-ignore: getElementById
              const btn = doc.getElementById("preview-" + mode);
              if (btn && previewIframe) {
                btn.addEventListener("click", () => {
                  // @ts-ignore: style
                  previewIframe.style.maxWidth = WIDTHS[mode];
                });
              }
            });
          })();
        }}
      </Script>

      {/* Modal Preview */}
      <div
        id="preview-modal"
        className="hidden fixed inset-0 z-50 flex flex-col bg-black/50"
      >
        <div className="flex items-center justify-between bg-gray-900 px-4 py-2 shrink-0">
          <div className="flex gap-2">
            <button
              id="preview-desktop"
              type="button"
              className="rounded px-3 py-1 text-sm text-white bg-indigo-600"
            >
              🖥 Desktop
            </button>
            <button
              id="preview-tablet"
              type="button"
              className="rounded px-3 py-1 text-sm text-white/70 hover:text-white"
            >
              📱 Tablet
            </button>
            <button
              id="preview-mobile"
              type="button"
              className="rounded px-3 py-1 text-sm text-white/70 hover:text-white"
            >
              📱 Mobile
            </button>
          </div>
          <button
            id="preview-close"
            type="button"
            className="text-white/70 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <iframe
            id="preview-iframe"
            src={`/admin/pages/${pageId}/builder/preview`}
            className="bg-white shadow-2xl rounded-lg border border-gray-200"
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              transition: "max-width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
