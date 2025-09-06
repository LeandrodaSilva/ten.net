import * as emit from "@deno/emit";
import { toFileUrl, join, isAbsolute, dirname } from "@std/path";

// (opcional) importe um import map, se você usa alias tipo "@app/"
import type { ImportMap } from "@deno/emit";
const importMap: ImportMap | undefined = await (async () => {
  try {
    const raw = await Deno.readTextFile("import_map.json");
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
})();

export async function transpileFile(tsPath: string) {
  // Gere uma URL absoluta baseada no CWD, não em import.meta.url
  const abs = isAbsolute(tsPath) ? tsPath : join(Deno.cwd(), tsPath);
  const spec = toFileUrl(abs); // file:///.../app/api/hello/route.ts

  const out = await emit.transpile(spec, { importMap }); // <- retorna Map<string, string>
  const js = out.get(spec.href);
  if (!js) {
    throw new Error(`Sem saída JS para ${tsPath} (verifique imports/alias).`);
  }

  const jsPath = abs.replace(/\.ts$/i, ".js");
  await Deno.mkdir(dirname(jsPath), { recursive: true });
  await Deno.writeTextFile(jsPath, js);
  console.log(`✔ Transpilado ${tsPath} -> ${jsPath}`);
}
