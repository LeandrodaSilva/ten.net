import {Ten} from "./mod.ts";

if (import.meta.main) {
  const app = Ten.net();
  await app.start();
}