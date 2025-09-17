/**
 * Convert "OneString" to "one-string"
 * @param text
 */
export function toSlug(text: string): string {
  	return text
		.replace(/([a-z])([A-Z])/g, '$1-$2') // Adiciona hífen entre letras minúsculas e maiúsculas
		.replace(/[\s_]+/g, '-') // Substitui espaços e underscores por hífen
		.toLowerCase(); // Converte para minúsculas
}
