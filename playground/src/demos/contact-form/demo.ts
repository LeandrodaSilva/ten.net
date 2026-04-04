import type { Demo } from "../../types.ts";
import type { AppManifest } from "../../../../src/build/manifest.ts";

const routeTs = `export function GET(req) {
  const url = new URL(req.url);
  const sent = url.searchParams.get("sent");
  const name = url.searchParams.get("name") ?? "";
  const email = url.searchParams.get("email") ?? "";

  if (sent) {
    return Response.json({
      section: '<div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:1.5rem;text-align:center;margin-top:1rem;">' +
        '<p style="font-size:1.25rem;font-weight:600;color:#166534;">Obrigado, ' + name + '!</p>' +
        '<p style="color:#15803d;margin-top:.5rem;">Recebemos sua mensagem em <strong>' + email + '</strong>.</p>' +
        '</div>',
    });
  }

  return Response.json({
    section: '<form method="POST" action="/contact">' +
      '<label style="display:block;margin-bottom:.5rem;font-weight:500;">Nome</label>' +
      '<input name="name" style="width:100%;padding:.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1rem;" placeholder="Seu nome" />' +
      '<label style="display:block;margin-bottom:.5rem;font-weight:500;">Email</label>' +
      '<input name="email" type="email" required style="width:100%;padding:.5rem;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:1.5rem;" placeholder="seu@email.com" />' +
      '<button type="submit" style="background:#3178c6;color:#fff;border:none;padding:.625rem 1.5rem;border-radius:6px;cursor:pointer;font-size:1rem;">Enviar</button>' +
      '</form>',
  });
}

export async function POST(req) {
  const data = await req.formData().catch(() => null);
  const name = encodeURIComponent((data?.get("name") ?? "").toString());
  const email = encodeURIComponent((data?.get("email") ?? "").toString());
  return new Response(null, {
    status: 302,
    headers: { Location: "/contact?sent=1&name=" + name + "&email=" + email },
  });
}`;

const pageHtml =
  `<div style="max-width:480px;margin:2rem auto;padding:1.5rem;font-family:system-ui,sans-serif;">
  <h1 style="margin-bottom:1rem;">Fale Conosco</h1>
  {{{section}}}
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
  documentHtml:
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contato</title><style>*{box-sizing:border-box;margin:0;padding:0}</style></head><body>{{content}}</body></html>',
  assets: {},
};

export const contactForm: Demo = {
  id: "contact-form",
  title: "Contact Form",
  description: "Formulario com validacao GET/POST e exibicao condicional",
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
