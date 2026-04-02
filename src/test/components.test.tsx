import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { Script } from "../../packages/admin/src/components/script.tsx";
import { Plugins } from "../../packages/admin/src/components/plugins.tsx";
import { Logs } from "../../packages/admin/src/components/logs.tsx";
import Dashboard from "../../packages/admin/src/layout/dashboard.tsx";
import { App, appWithChildren } from "../../packages/admin/src/app.tsx";
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
  const samplePlugins = [
    { name: "Pages", slug: "page-plugin", description: "Manage your pages" },
    { name: "Posts", slug: "post-plugin", description: "Manage your posts" },
  ];

  it("should render empty state when no plugins", () => {
    const html = renderToString(<Plugins />);
    assertStringIncludes(html, "No plugins registered");
  });

  it("should render plugin cards when plugins provided", () => {
    const html = renderToString(<Plugins plugins={samplePlugins} />);
    assertStringIncludes(html, "Pages");
    assertStringIncludes(html, "Posts");
  });

  it("should contain link to plugin slug", () => {
    const html = renderToString(<Plugins plugins={samplePlugins} />);
    assertStringIncludes(html, "/admin/plugins/page-plugin");
    assertStringIncludes(html, "/admin/plugins/post-plugin");
  });

  it("should render card descriptions", () => {
    const html = renderToString(<Plugins plugins={samplePlugins} />);
    assertStringIncludes(html, "Manage your pages");
    assertStringIncludes(html, "Manage your posts");
  });
});

describe("Logs component", () => {
  it("should render empty state", () => {
    const html = renderToString(<Logs />);
    assertStringIncludes(html, "No recent activity");
    assertStringIncludes(
      html,
      "Activity will appear here as you use the admin panel",
    );
  });
});

describe("Dashboard layout", () => {
  it("should render header with logo", () => {
    const html = renderToString(
      <Dashboard>
        <div>Test content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Ten.net");
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

  it("should render notification button", () => {
    const html = renderToString(
      <Dashboard>
        <div>Content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Ver notificações");
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
    assertStringIncludes(result, "Ten.net");
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
    assertStringIncludes(html, "No plugins registered");
  });
});
