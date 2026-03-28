import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { Script } from "../admin/components/script.tsx";
import { Plugins } from "../admin/components/plugins.tsx";
import { PluginList } from "../admin/components/plugin-list.tsx";
import { Logs } from "../admin/components/logs.tsx";
import Dashboard from "../layout/dashboard.tsx";
import { App, appWithChildren } from "../admin/app.tsx";
import type { ReactElement } from "react";

describe("Script component", () => {
  it("should render a script tag with extracted function body", () => {
    const html = renderToString(
      <Script>
        {() => {
          console.log("hello");
        }}
      </Script>,
    );
    assertStringIncludes(html, "<script");
    assertStringIncludes(html, "console.log");
  });

  it("should render module type script", () => {
    const html = renderToString(
      <Script>
        {() => {
          const x = 1;
          console.log(x);
        }}
      </Script>,
    );
    assertStringIncludes(html, 'type="module"');
  });

  it("should render empty body when function has no braces", () => {
    const fn = (() => void 0) as unknown as () => void;
    const html = renderToString(<Script>{fn}</Script>);
    assertStringIncludes(html, "<script");
    assertStringIncludes(html, 'type="module"');
    // O regex não encontra chaves em "() => void 0", bodyMatch é null → functionBody = ""
    assertEquals(html.includes("void 0"), false);
  });
});

describe("Plugins component", () => {
  it("should render the plugins grid", () => {
    const html = renderToString(<Plugins />);
    assertStringIncludes(html, "Pages");
    assertStringIncludes(html, "Posts");
    assertStringIncludes(html, "Categories");
    assertStringIncludes(html, "Groups");
    assertStringIncludes(html, "Users");
    assertStringIncludes(html, "Settings");
  });

  it("should contain link to page-plugin", () => {
    const html = renderToString(<Plugins />);
    assertStringIncludes(html, "/admin/plugins/page-plugin");
  });

  it("should render card descriptions", () => {
    const html = renderToString(<Plugins />);
    assertStringIncludes(html, "Here contains all pages created by you");
    assertStringIncludes(html, "Here contains all posts created by you");
  });
});

describe("PluginList component", () => {
  it("should render a table with headers", () => {
    const html = renderToString(<PluginList />);
    assertStringIncludes(html, "Name");
    assertStringIncludes(html, "Title");
    assertStringIncludes(html, "Email");
    assertStringIncludes(html, "Role");
  });

  it("should render template placeholders", () => {
    const html = renderToString(<PluginList />);
    assertStringIncludes(html, "{{plugin}}");
    assertStringIncludes(html, "{{description}}");
  });

  it("should render table rows with sample data", () => {
    const html = renderToString(<PluginList />);
    assertStringIncludes(html, "Lindsay Walton");
    assertStringIncludes(html, "Courtney Henry");
    assertStringIncludes(html, "Tom Cook");
  });

  it("should render Add user button", () => {
    const html = renderToString(<PluginList />);
    assertStringIncludes(html, "Add user");
  });
});

describe("Logs component", () => {
  it("should render timeline items", () => {
    const html = renderToString(<Logs />);
    assertStringIncludes(html, "Front End Developer");
    assertStringIncludes(html, "Bethany Blake");
    assertStringIncludes(html, "Martha Gardner");
    assertStringIncludes(html, "Katherine Snyder");
  });

  it("should render time elements", () => {
    const html = renderToString(<Logs />);
    assertStringIncludes(html, "Sep 20");
    assertStringIncludes(html, "Sep 22");
    assertStringIncludes(html, "Oct 4");
  });
});

describe("Dashboard layout", () => {
  it("should render header with logo", () => {
    const html = renderToString(
      <Dashboard>
        <div>Test content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Your Company");
    assertStringIncludes(html, "bg-gray-900");
  });

  it("should render children in main area", () => {
    const html = renderToString(
      <Dashboard>
        <div>My custom content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "My custom content");
  });

  it("should render aside with Logs", () => {
    const html = renderToString(
      <Dashboard>
        <div>Content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Front End Developer");
  });

  it("should render notification button", () => {
    const html = renderToString(
      <Dashboard>
        <div>Content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "View notifications");
  });
});

describe("appWithChildren", () => {
  it("should return HTML string with DOCTYPE", () => {
    const TestComponent = () => <div>Hello</div>;
    const result = appWithChildren(TestComponent);
    assertStringIncludes(result, "<!DOCTYPE html>");
  });

  it("should include Tailwind CSS CDN", () => {
    const TestComponent = () => <div>Test</div>;
    const result = appWithChildren(TestComponent);
    assertStringIncludes(result, "tailwindcss");
  });

  it("should render the child component", () => {
    const TestComponent = () => <span>Custom child content</span>;
    const result = appWithChildren(TestComponent);
    assertStringIncludes(result, "Custom child content");
  });

  it("should include Dashboard layout", () => {
    const TestComponent = () => <div>Test</div>;
    const result = appWithChildren(TestComponent);
    assertStringIncludes(result, "Your Company");
  });

  it("should be a string", () => {
    const TestComponent = () => <div>Test</div>;
    const result = appWithChildren(TestComponent);
    assertEquals(typeof result, "string");
  });

  it("should render Plugins fallback when children is falsy", () => {
    const html = renderToString(
      <App>{null as unknown as ReactElement}</App>,
    );
    // Quando children é null/falsy, o || <Plugins /> ativa o fallback
    assertStringIncludes(html, "Pages");
    assertStringIncludes(html, "/admin/plugins/page-plugin");
  });
});
