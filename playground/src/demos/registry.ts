import type { Demo, DemoCategory } from "../types.ts";
import { helloWorld } from "./hello-world/demo.ts";
import { dynamicRoutes } from "./dynamic-routes/demo.ts";
import { apiRest } from "./api-rest/demo.ts";
import { pageLayout } from "./page-layout/demo.ts";
import { nestedLayouts } from "./nested-layouts/demo.ts";
import { contactForm } from "./contact-form/demo.ts";
import { landingPage } from "./landing-page/demo.ts";
import { todoOffline } from "./todo-offline/demo.ts";

const ALL_DEMOS: Demo[] = [
  helloWorld,
  dynamicRoutes,
  apiRest,
  pageLayout,
  nestedLayouts,
  contactForm,
  landingPage,
  todoOffline,
];

export function getDemos(): Demo[] {
  return ALL_DEMOS;
}
export function getDemoById(id: string): Demo | undefined {
  return ALL_DEMOS.find((d) => d.id === id);
}
export function getDemosByCategory(category: DemoCategory): Demo[] {
  return ALL_DEMOS.filter((d) => d.category === category);
}
