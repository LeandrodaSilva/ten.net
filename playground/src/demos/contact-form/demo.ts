import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET() {
  return Response.json({
    title: "Fale Conosco",
  });
}`;

const pageHtml =
  `<div style="max-width:480px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;">
  <h1 style="margin-bottom:1rem;">{{title}}</h1>

  <div id="result" style="display:none;background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:1.5rem;text-align:center;margin-bottom:1rem;">
    <p id="result-msg" style="font-size:1.25rem;font-weight:600;color:#166534;"></p>
  </div>

  <form id="contact-form">
    <label style="display:block;margin-bottom:.5rem;font-weight:500;">Nome</label>
    <input id="f-name" style="width:100%;padding:.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1rem;" placeholder="Seu nome" />

    <label style="display:block;margin-bottom:.5rem;font-weight:500;">Email</label>
    <input id="f-email" type="email" required style="width:100%;padding:.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1.5rem;" placeholder="seu@email.com" />

    <button type="submit" style="background:#3178c6;color:#fff;border:none;padding:.625rem 1.5rem;border-radius:6px;cursor:pointer;font-size:1rem;">
      Enviar
    </button>
  </form>
</div>

<script>
  document.getElementById("contact-form").addEventListener("submit", function(e) {
    e.preventDefault();
    var name = document.getElementById("f-name").value;
    var email = document.getElementById("f-email").value;
    if (!name || !email) return;
    document.getElementById("contact-form").style.display = "none";
    document.getElementById("result").style.display = "block";
    document.getElementById("result-msg").textContent = "Obrigado, " + name + "! Recebemos sua mensagem em " + email + ".";
  });
</script>`;

const manifest: AppManifest = {
  routes: [{
    path: "/contact",
    regexSource: "^\\/contact$",
    regexFlags: "",
    hasPage: true,
    transpiledCode: routeTs,
    pageContent: pageHtml,
  }],
  layouts: {},
  documentHtml:
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{title}}</title><style>*{box-sizing:border-box;margin:0;padding:0}</style></head><body>{{content}}</body></html>',
  assets: {},
};

export const contactForm: Demo = {
  id: "contact-form",
  title: "Contact Form",
  description: "Formulario com validacao e feedback visual",
  category: "forms",
  files: [
    {
      name: "route.ts",
      content: routeTs,
      language: "typescript",
      editable: true,
    },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
  ],
  manifest,
  previewPath: "/contact",
};
