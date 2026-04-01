import { describe, it } from "@std/testing/bdd";
import { assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { App } from "../../packages/admin/src/app.tsx";
import Dashboard from "../../packages/admin/src/layout/dashboard.tsx";
import type { ReactElement } from "react";

describe("App accessibility", () => {
  it("should render html with lang=en", () => {
    const html = renderToString(
      <App>{<div>test</div> as ReactElement}</App>,
    );
    assertStringIncludes(html, 'lang="en"');
  });

  it("should render meta charset", () => {
    const html = renderToString(
      <App>{<div>test</div> as ReactElement}</App>,
    );
    assertStringIncludes(html, "charSet");
  });

  it("should render meta viewport", () => {
    const html = renderToString(
      <App>{<div>test</div> as ReactElement}</App>,
    );
    assertStringIncludes(html, "viewport");
    assertStringIncludes(html, "width=device-width");
  });

  it("should render title element", () => {
    const html = renderToString(
      <App>{<div>test</div> as ReactElement}</App>,
    );
    assertStringIncludes(html, "<title>");
    assertStringIncludes(html, "Admin");
  });

  it("should render skip-to-content link targeting #main-content", () => {
    const html = renderToString(
      <App>{<div>test</div> as ReactElement}</App>,
    );
    assertStringIncludes(html, "#main-content");
    assertStringIncludes(html, "Skip to content");
  });

  it("should render Tailwind CSS CDN link", () => {
    const html = renderToString(
      <App>{<div>test</div> as ReactElement}</App>,
    );
    assertStringIncludes(html, "tailwindcss");
  });
});

describe("Dashboard accessibility", () => {
  it("should render main with id=main-content", () => {
    const html = renderToString(
      <Dashboard>{<div>Content</div> as ReactElement}</Dashboard>,
    );
    assertStringIncludes(html, 'id="main-content"');
  });

  it("should render aside with aria-label=Activity log", () => {
    const html = renderToString(
      <Dashboard>{<div>Content</div> as ReactElement}</Dashboard>,
    );
    assertStringIncludes(html, 'aria-label="Activity log"');
  });

  it("should render notification button with sr-only text", () => {
    const html = renderToString(
      <Dashboard>{<div>Content</div> as ReactElement}</Dashboard>,
    );
    assertStringIncludes(html, "View notifications");
    assertStringIncludes(html, "sr-only");
  });

  it("should render header with bg-gray-900 class", () => {
    const html = renderToString(
      <Dashboard>{<div>Content</div> as ReactElement}</Dashboard>,
    );
    assertStringIncludes(html, "bg-gray-900");
  });

  it("should render focus-visible classes on notification button", () => {
    const html = renderToString(
      <Dashboard>{<div>Content</div> as ReactElement}</Dashboard>,
    );
    assertStringIncludes(html, "focus-visible:outline-2");
  });

  it("should render children inside main", () => {
    const html = renderToString(
      <Dashboard>
        {<div id="unique-child">Unique Content</div> as ReactElement}
      </Dashboard>,
    );
    assertStringIncludes(html, "Unique Content");
  });

  it("should render aside with aria-label=Site navigation", () => {
    const html = renderToString(
      <Dashboard>{<div>test</div> as ReactElement}</Dashboard>,
    );
    assertStringIncludes(html, 'aria-label="Site navigation"');
  });
});
