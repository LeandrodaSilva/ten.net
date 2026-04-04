import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET() {
  return {
    formStyle: "display:block",
    resultStyle: "display:none",
    errorStyle: "display:none",
    name: "",
    email: "",
    errorMsg: "",
  };
}

export async function POST(ctx) {
  const data = await ctx.req.formData().catch(() => null);
  const name = data?.get("name") ?? "";
  const email = data?.get("email") ?? "";

  if (!name || !email) {
    return {
      formStyle: "display:block",
      resultStyle: "display:none",
      errorStyle: "display:block",
      name,
      email,
      errorMsg: "Nome e email sao obrigatorios.",
    };
  }

  return {
    formStyle: "display:none",
    resultStyle: "display:block",
    errorStyle: "display:none",
    name,
    email,
    errorMsg: "",
  };
}`;

const pageHtml = `<div style="max-width:480px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;">
  <h1 style="margin-bottom:1rem;">Fale Conosco</h1>

  <div style="{{errorStyle}};background:#fee2e2;color:#991b1b;padding:.75rem 1rem;border-radius:6px;margin-bottom:1rem;">
    {{errorMsg}}
  </div>

  <form style="{{formStyle}}" method="POST" action="/contact">
    <label style="display:block;margin-bottom:.5rem;font-weight:500;">Nome</label>
    <input name="name" value="{{name}}" style="width:100%;padding:.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1rem;" placeholder="Seu nome" />

    <label style="display:block;margin-bottom:.5rem;font-weight:500;">Email</label>
    <input name="email" type="email" value="{{email}}" style="width:100%;padding:.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1.5rem;" placeholder="seu@email.com" />

    <button type="submit" style="background:#3178c6;color:#fff;border:none;padding:.625rem 1.5rem;border-radius:6px;cursor:pointer;font-size:1rem;">
      Enviar
    </button>
  </form>

  <div style="{{resultStyle}};background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:1.5rem;text-align:center;">
    <p style="font-size:1.25rem;font-weight:600;color:#166534;">Obrigado, {{name}}!</p>
    <p style="color:#15803d;margin-top:.5rem;">Recebemos sua mensagem em <strong>{{email}}</strong>.</p>
  </div>
</div>`;

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
  documentHtml: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contato</title><style>*{box-sizing:border-box;margin:0;padding:0}</style></head><body>{{content}}</body></html>',
  assets: {},
};

export const contactForm: Demo = {
  id: "contact-form",
  title: "Contact Form",
  description: "Formulario com validacao GET/POST e exibicao condicional",
  category: "forms",
  files: [
    { name: "route.ts", content: routeTs, language: "typescript", editable: true },
    { name: "page.html", content: pageHtml, language: "html", editable: true },
  ],
  manifest,
  previewPath: "/contact",
};
