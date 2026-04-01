// Shim for backwards compatibility — implementation moved to packages/core/src/build/buildCommand.ts
import { main } from "../../packages/core/src/build/buildCommand.ts";

if (import.meta.main) {
  main();
}
