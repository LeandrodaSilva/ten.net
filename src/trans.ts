export async function transpileFile(tsPath: string): Promise<string> {
	const result = await Deno.bundle({
		entrypoints: [
			tsPath
		],
		platform: "deno",
		minify: false,
	});
	if (result.success) {
		const file = result.outputFiles.shift()
		if (!file) {
			throw new Error(`Sem saída JS para ${tsPath} (verifique imports/alias).`);
		}
		console.log(`✔ Transpilado ${tsPath} -> ${file.path}`);
		return file.text();
	} else {
		console.error(`✘ Erro ao transpilar ${tsPath}:`, result.errors);
	}

	return "";
}
