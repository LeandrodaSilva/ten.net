import type { Demo, DemoCategory } from "../types.ts";
import { helloWorld } from "./hello-world/demo.ts";

const ALL_DEMOS: Demo[] = [helloWorld];

export function getDemos(): Demo[] { return ALL_DEMOS; }
export function getDemoById(id: string): Demo | undefined { return ALL_DEMOS.find((d) => d.id === id); }
export function getDemosByCategory(category: DemoCategory): Demo[] { return ALL_DEMOS.filter((d) => d.category === category); }
