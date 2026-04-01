// Shim for backwards compatibility — implementation moved to packages/core/src/cli.ts
import { main } from "../packages/core/src/cli.ts";

if (import.meta.main) {
  main();
}
