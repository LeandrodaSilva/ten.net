import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";

describe("Playground build", () => {
  it("should build playground dist files", async () => {
    const cmd = new Deno.Command("deno", {
      args: ["run", "--allow-all", "playground/build.ts"],
    });
    const { code } = await cmd.output();
    assertEquals(code, 0);

    const indexStat = await Deno.stat("playground/dist/index.html");
    assertEquals(indexStat.isFile, true);

    const swStat = await Deno.stat("playground/dist/sw.js");
    assertEquals(swStat.isFile, true);

    const appStat = await Deno.stat("playground/dist/app.js");
    assertEquals(appStat.isFile, true);
  });
});
