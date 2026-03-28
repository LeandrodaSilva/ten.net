import { Ten } from "./src/mod.ts";

if (import.meta.main) {
  const app = Ten.net();
  await app.start();
}
