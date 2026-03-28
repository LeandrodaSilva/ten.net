/** Performance thresholds in milliseconds. Values are generous (3-5x expected) to avoid flaky CI. */
export const THRESHOLDS: Record<string, number> = {
  // Micro (pure functions) — max 1ms
  "getRegexRoute_static": 1,
  "getRegexRoute_dynamic": 1,
  "pathNamedParams": 1,
  "paramsEngine": 1,
  "toSlug": 1,
  "regex_test_match": 0.5,
  "regex_test_nomatch": 0.5,

  // I/O utils — max 5ms
  "findOrderedLayouts": 5,
  "findDocumentLayoutRoot": 5,

  // Engines — max 50ms (viewEngine), 2000ms (routerEngine with transpilation)
  "routerEngine_full": 2000,
  "viewEngine_static": 50,
  "viewEngine_data": 50,

  // HTTP requests — max per request
  "http_static_page": 50,
  "http_view_template": 50,
  "http_api": 20,
  "http_dynamic_param": 30,
  "http_admin": 100,
  "http_404": 10,
  "http_post_redirect": 50,
} as const;

/** Multiplier for regression detection against historical average. */
export const REGRESSION_MULTIPLIER = 1.5;
