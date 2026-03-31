import type { WidgetDefinition, WidgetInstance } from "../types.ts";

/**
 * Contact Form widget — static HTML form. Email processing in next version.
 */
export const contactFormWidget: WidgetDefinition = {
  type: "contact-form",
  label: "Formulário de Contato",
  description:
    "Formulário de contato. Processamento de envio na próxima versão.",
  icon: "📧",
  fields: [
    {
      name: "title",
      label: "Title",
      type: "text",
      required: false,
      default: "",
    },
    {
      name: "email_to",
      label: "Send To (Email)",
      type: "text",
      required: true,
      default: "",
    },
    {
      name: "submit_label",
      label: "Submit Button Label",
      type: "text",
      required: false,
      default: "Enviar",
    },
    {
      name: "fields",
      label: "Extra Fields (JSON array)",
      type: "textarea",
      required: false,
      default: "",
    },
  ],
  defaultPlaceholder: "main",
  render(instance: WidgetInstance): string {
    const title = String(instance.data.title ?? "");
    // email_to is intentionally NOT rendered in the HTML output
    const submitLabel = String(instance.data.submit_label ?? "Enviar");
    const fieldsRaw = String(instance.data.fields ?? "");

    let extraFields: { name: string; label: string; type?: string }[] = [];
    if (fieldsRaw.trim()) {
      try {
        const parsed = JSON.parse(fieldsRaw);
        if (Array.isArray(parsed)) {
          extraFields = parsed.filter(
            (f) => f && typeof f === "object" && typeof f.name === "string",
          );
        }
      } catch {
        // Invalid JSON — no extra fields
      }
    }

    const titleHtml = title
      ? `<h2 class="text-2xl font-bold text-gray-900 mb-6">${
        escapeHtml(title)
      }</h2>`
      : "";

    const defaultFieldsHtml = `
  <div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-1" for="contact-name">Nome</label>
    <input id="contact-name" type="text" name="name" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
  </div>
  <div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-1" for="contact-email">E-mail</label>
    <input id="contact-email" type="email" name="email" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
  </div>
  <div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-1" for="contact-message">Mensagem</label>
    <textarea id="contact-message" name="message" rows="4" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" required></textarea>
  </div>`;

    const extraFieldsHtml = extraFields.map((f) => {
      const fieldType = f.type === "textarea" ? "textarea" : "text";
      const id = `contact-extra-${escapeAttr(f.name)}`;
      const label =
        `<label class="block text-sm font-medium text-gray-700 mb-1" for="${id}">${
          escapeHtml(f.label ?? f.name)
        }</label>`;
      const input = fieldType === "textarea"
        ? `<textarea id="${id}" name="${
          escapeAttr(f.name)
        }" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>`
        : `<input id="${id}" type="text" name="${
          escapeAttr(f.name)
        }" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">`;
      return `  <div class="mb-4">\n    ${label}\n    ${input}\n  </div>`;
    }).join("\n");

    return `<div class="ten-widget-contact-form max-w-xl mx-auto py-8 px-4">
  ${titleHtml}
  <form action="/api/contact" method="POST" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
${defaultFieldsHtml}
${extraFieldsHtml}
  <button type="submit" class="w-full bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors">${
      escapeHtml(submitLabel)
    }</button>
  </form>
</div>`;
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
