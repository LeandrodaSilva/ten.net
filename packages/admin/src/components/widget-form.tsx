// deno-lint-ignore-file no-explicit-any
import type {
  WidgetDefinition,
  WidgetFieldSchema,
  WidgetInstance,
} from "@leproj/tennet-widgets";
import { Script } from "./script.tsx";

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
          <div className="widget-rich-text widget-tiptap-wrap rounded-md border border-gray-300 overflow-hidden">
            <div className="widget-tiptap-toolbar flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
              {[
                { action: "bold", label: "B" },
                { action: "italic", label: "I" },
                { action: "h2", label: "H2" },
                { action: "h3", label: "H3" },
                { action: "bulletList", label: "• List" },
                { action: "orderedList", label: "1. List" },
                { action: "blockquote", label: "❝" },
                { action: "codeBlock", label: "</>" },
                { action: "link", label: "Link" },
                { action: "image", label: "Img" },
              ].map(({ action, label }) => (
                <button
                  key={action}
                  type="button"
                  data-action={action}
                  className="px-2 py-1 text-sm rounded hover:bg-gray-200"
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="widget-tiptap-editor prose max-w-none p-3 min-h-[160px]"
              data-field={inputName}
            />
            <textarea
              id={inputName}
              name={inputName}
              rows={6}
              defaultValue={value}
              required={field.required}
              style={{ display: "none" }}
            />
          </div>
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
          <div className="flex gap-x-2">
            <input
              type="url"
              id={inputName}
              name={inputName}
              defaultValue={value}
              required={field.required}
              placeholder="Image URL"
              className={`${baseInputClass} flex-1`}
            />
            <button
              type="button"
              data-media-picker="true"
              data-target-field={inputName}
              className="shrink-0 inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Escolher da biblioteca
            </button>
          </div>
        )}
        {field.type === "gallery" && (
          <textarea
            id={inputName}
            name={inputName}
            rows={4}
            defaultValue={value}
            required={field.required}
            placeholder='["https://example.com/img1.jpg", "https://example.com/img2.jpg"]'
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
  const hasRichText = widgetDefinition.fields.some((f) =>
    f.type === "rich-text"
  );
  return (
    <>
      <div className="space-y-6">
        {widgetDefinition.fields.map((field) => (
          <WidgetField key={field.name} field={field} values={values} />
        ))}
      </div>
      <Script>
        {() => {
          // @ts-ignore: DOM APIs available at runtime
          const doc = globalThis.document;
          if (!doc) return;

          // Open media picker modal when clicking "Escolher da biblioteca"
          // @ts-ignore: DOM APIs
          doc.addEventListener("click", (e: MouseEvent) => {
            // @ts-ignore: DOM APIs
            const btn = (e.target as HTMLElement)?.closest?.(
              "[data-media-picker]",
            ) as HTMLElement | null;
            if (!btn) return;
            // @ts-ignore: DOM APIs
            const targetField = btn.dataset.targetField ?? "";
            // @ts-ignore: DOM APIs
            const modal = doc.getElementById("media-picker-modal") as any;
            if (modal) {
              // @ts-ignore: DOM APIs
              modal.classList.remove("hidden");
              // @ts-ignore: DOM APIs
              modal.dataset.targetField = targetField;
            }
          });
        }}
      </Script>
      {hasRichText && (
        <Script>
          {() => {
            // @ts-ignore: async IIFE for TipTap initialization
            (async () => {
              // Inject ProseMirror styles
              // @ts-ignore: DOM APIs
              const style = document.createElement("style");
              // @ts-ignore: DOM APIs
              style.textContent =
                ".ProseMirror{outline:none;min-height:160px;}" +
                ".ProseMirror p.is-editor-empty:first-child::before{" +
                "content:'Comece a escrever...';color:#9ca3af;" +
                "float:left;pointer-events:none;height:0;}";
              // @ts-ignore: DOM APIs
              document.head.appendChild(style);

              // @ts-ignore: dynamic imports
              // deno-lint-ignore no-import-prefix
              const { Editor } = await import("https://esm.sh/@tiptap/core");
              // @ts-ignore: dynamic imports
              const { default: StarterKit } = await import(
                // deno-lint-ignore no-import-prefix
                "https://esm.sh/@tiptap/starter-kit"
              );
              // @ts-ignore: dynamic imports
              const { default: TiptapImage } = await import(
                // deno-lint-ignore no-import-prefix
                "https://esm.sh/@tiptap/extension-image"
              );

              // @ts-ignore: DOM APIs
              document.querySelectorAll(".widget-tiptap-editor").forEach(
                // @ts-ignore: DOM APIs
                (container) => {
                  // @ts-ignore: DOM APIs
                  const fieldName = container.getAttribute("data-field");
                  // @ts-ignore: DOM APIs
                  const textarea = document.querySelector(
                    "textarea[name='" + fieldName + "']",
                  );
                  if (!textarea) return;

                  // @ts-ignore: TipTap
                  const editor = new Editor({
                    element: container,
                    extensions: [
                      // @ts-ignore: TipTap
                      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
                      // @ts-ignore: TipTap
                      TiptapImage.configure({ inline: false }),
                    ],
                    // @ts-ignore: DOM APIs
                    content: (textarea as HTMLTextAreaElement).value ||
                      "<p></p>",
                    // @ts-ignore: TipTap
                    onUpdate({ editor }: any) {
                      // @ts-ignore: DOM APIs
                      (textarea as HTMLTextAreaElement).value = editor
                        .getHTML();
                    },
                  });

                  // @ts-ignore: DOM APIs
                  const form = container.closest("form");
                  if (form) {
                    // @ts-ignore: DOM APIs
                    form.addEventListener("submit", () => {
                      // @ts-ignore: DOM APIs
                      (textarea as HTMLTextAreaElement).value = editor
                        .getHTML();
                    });
                  }

                  // @ts-ignore: DOM APIs
                  const toolbar = container
                    .closest(".widget-tiptap-wrap")
                    ?.querySelector(".widget-tiptap-toolbar");
                  if (toolbar) {
                    // @ts-ignore: DOM APIs
                    toolbar.addEventListener("click", (e: any) => {
                      // @ts-ignore: DOM APIs
                      const btn = e.target.closest("[data-action]");
                      if (!btn) return;
                      // @ts-ignore: DOM APIs
                      const action = btn.dataset.action;
                      // @ts-ignore: TipTap
                      const chain = editor.chain().focus();
                      switch (action) {
                        case "bold":
                          chain.toggleBold().run();
                          break;
                        case "italic":
                          chain.toggleItalic().run();
                          break;
                        case "h2":
                          chain.toggleHeading({ level: 2 }).run();
                          break;
                        case "h3":
                          chain.toggleHeading({ level: 3 }).run();
                          break;
                        case "bulletList":
                          chain.toggleBulletList().run();
                          break;
                        case "orderedList":
                          chain.toggleOrderedList().run();
                          break;
                        case "blockquote":
                          chain.toggleBlockquote().run();
                          break;
                        case "codeBlock":
                          chain.toggleCodeBlock().run();
                          break;
                        case "link": {
                          // @ts-ignore: DOM APIs
                          const url = prompt("URL:");
                          if (url) chain.setLink({ href: url }).run();
                          // @ts-ignore: TipTap
                          else editor.chain().focus().unsetLink().run();
                          break;
                        }
                        case "image": {
                          // @ts-ignore: DOM APIs
                          const src = prompt("Image URL:");
                          if (src) chain.setImage({ src }).run();
                          break;
                        }
                      }
                    });

                    const updateActive = () => {
                      // @ts-ignore: DOM APIs
                      toolbar.querySelectorAll("[data-action]").forEach(
                        // @ts-ignore: DOM APIs
                        (btn: any) => {
                          // @ts-ignore: DOM APIs
                          const a = btn.dataset.action;
                          let active = false;
                          // @ts-ignore: TipTap
                          if (a === "bold") active = editor.isActive("bold");
                          // @ts-ignore: TipTap
                          if (a === "italic") {
                            active = editor.isActive("italic");
                          }
                          // @ts-ignore: TipTap
                          if (a === "h2") {
                            active = editor.isActive("heading", { level: 2 });
                          }
                          // @ts-ignore: TipTap
                          if (a === "h3") {
                            active = editor.isActive("heading", { level: 3 });
                          }
                          // @ts-ignore: TipTap
                          if (a === "bulletList") {
                            active = editor.isActive("bulletList");
                          }
                          // @ts-ignore: TipTap
                          if (a === "orderedList") {
                            active = editor.isActive("orderedList");
                          }
                          // @ts-ignore: TipTap
                          if (a === "blockquote") {
                            active = editor.isActive("blockquote");
                          }
                          // @ts-ignore: TipTap
                          if (a === "codeBlock") {
                            active = editor.isActive("codeBlock");
                          }
                          // @ts-ignore: TipTap
                          if (a === "link") active = editor.isActive("link");
                          btn.classList.toggle("bg-indigo-100", active);
                          btn.classList.toggle("text-indigo-700", active);
                        },
                      );
                    };
                    // @ts-ignore: TipTap
                    editor.on("selectionUpdate", updateActive);
                    // @ts-ignore: TipTap
                    editor.on("update", updateActive);
                  }
                },
              );
            })();
          }}
        </Script>
      )}
    </>
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
