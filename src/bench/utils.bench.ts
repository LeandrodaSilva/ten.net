import { getRegexRoute } from "../../src/utils/getRegexRoute.ts";
import { pathNamedParams } from "../../src/utils/pathNamedParams.ts";
import { paramsEngine } from "../../src/paramsEngine.ts";
import { findOrderedLayouts } from "../../src/utils/findOrderedLayouts.ts";
import { findDocumentLayoutRoot } from "../../src/utils/findDocumentLayoutRoot.ts";
import { toSlug } from "../../src/utils/toSlug.ts";
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
