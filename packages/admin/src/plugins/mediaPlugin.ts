import { Plugin, type PluginModel } from "@leproj/tennet";

/** Campos opcionais que não geram erro de validação quando ausentes. */
const OPTIONAL_FIELDS = new Set(["alt", "uploadedBy"]);

/**
 * MediaPlugin — plugin de galeria de mídia para o painel admin.
 * Gerencia metadados de arquivos enviados via upload.
 * O conteúdo binário é armazenado separadamente via MediaStore (chunking KV).
 */
export class MediaPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "MediaPlugin";
    this.description = "Biblioteca de mídia para gerenciar imagens enviadas.";
    this.model = {
      filename: "string",
      originalName: "string",
      mimeType: "string",
      size: "number",
      alt: "string",
      uploadedBy: "string",
      createdAt: "string",
    };
  }

  public override validate(
    data: Record<string, unknown>,
  ): { valid: boolean; errors: Record<string, string> } {
    const { errors } = super.validate(data);

    for (const field of OPTIONAL_FIELDS) {
      delete errors[field];
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }
}
