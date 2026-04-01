import { getRegexRoute } from "../../packages/core/src/utils/getRegexRoute.ts";
import { pathNamedParams } from "../../packages/core/src/utils/pathNamedParams.ts";
import { paramsEngine } from "../../packages/core/src/paramsEngine.ts";
import { findOrderedLayouts } from "../../packages/core/src/utils/findOrderedLayouts.ts";
import { findDocumentLayoutRoot } from "../../packages/core/src/utils/findDocumentLayoutRoot.ts";
import { toSlug } from "../../packages/core/src/utils/toSlug.ts";
import { createRoute } from "./_helpers.ts";

// --- getRegexRoute ---

Deno.bench("getRegexRoute_static", () => {
  getRegexRoute("/api/hello");
});

Deno.bench("getRegexRoute_dynamic", () => {
  getRegexRoute("/api/hello/[name]");
});

// --- pathNamedParams ---

Deno.bench("pathNamedParams", () => {
  pathNamedParams("/api/hello/John", "/api/hello/[name]");
});

// --- paramsEngine ---

const paramRoute = createRoute({ path: "/api/hello/[name]" });

Deno.bench("paramsEngine", () => {
  paramsEngine("/api/hello/John", paramRoute);
});

// --- toSlug ---

Deno.bench("toSlug", () => {
  toSlug("Hello World Example");
});

// --- regex matching ---

const staticRegex = getRegexRoute("/api/hello");

Deno.bench("regex_test_match", () => {
  staticRegex.test("/api/hello");
});

Deno.bench("regex_test_nomatch", () => {
  staticRegex.test("/not/found");
});

// --- I/O utils ---

Deno.bench("findOrderedLayouts", () => {
  findOrderedLayouts("./app", "/hello");
});

Deno.bench("findDocumentLayoutRoot", () => {
  findDocumentLayoutRoot("./app");
});
