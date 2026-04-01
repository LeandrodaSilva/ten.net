/**
 * Convert "OneString" to "one-string"
 * @param text
 */
export function toSlug(text: string): string {
  return String(text)
    .trim() // Remove espaços em branco no início e no fim
    .replace("null", "") // Remove a palavra 'null'
    .replace("undefined", "") // Remove a palavra 'undefined'
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Adiciona hífen entre letras minúsculas e maiúsculas
    .replace(/[\s_]+/g, "-") // Substitui espaços e underscores por hífen
    .replace(/[^a-zA-Z0-9-]/g, "-") // Remove caracteres especiais, exceto hífen
    .replace(/--+/g, "-") // Substitui múltiplos hífens por um único hífen
    .replace(/^-+|-+$/g, "") // Remove hífens do início e do fim
    .toLowerCase(); // Converte para minúsculas
}
