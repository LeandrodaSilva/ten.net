import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { WidgetPalette } from "../admin/components/widget-palette.tsx";
import { BuilderWidgetCard } from "../admin/components/builder-widget-card.tsx";
import { PageBuilderEditor } from "../admin/components/page-builder-editor.tsx";
import { BuilderLayout } from "../admin/layout/builder-layout.tsx";
import type {
  WidgetDefinition,
  WidgetInstance,
} from "../widgets/types.ts";

// --- Fixtures ---

const fakeDefinition: WidgetDefinition = {
  type: "hero",
  label: "Hero Banner",
  description: "A hero section with heading and CTA",
  icon: "\u{1F3AF}",
  fields: [
    { name: "heading", label: "Heading", type: "text", required: true },
  ],
  render: () => "<div>hero</div>",
};

const fakeDefinitionNoIcon: WidgetDefinition = {
  type: "rich-text",
  label: "Rich Text",
  description: "A rich text content block",
  fields: [
    { name: "content", label: "Content", type: "rich-text" },
  ],
  render: () => "<div>text</div>",
};

const fakeWidget: WidgetInstance = {
  id: "w-001",
  type: "hero",
  placeholder: "main",
  order: 0,
  data: { heading: "Welcome" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const fakeWidgetUnknown: WidgetInstance = {
  id: "w-002",
  type: "custom:unknown-type" as WidgetInstance["type"],
  placeholder: "main",
  order: 1,
  data: { foo: "bar" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// --- WidgetPalette ---
describe("WidgetPalette component", () => {
  it("should render widget list items for each available widget", () => {
    const html = renderToString(
      <WidgetPalette availableWidgets={[fakeDefinition, fakeDefinitionNoIcon]} />,
    );
    assertStringIncludes(html, "Hero Banner");
    assertStringIncludes(html, "Rich Text");
  });

  it("should render data-add-widget attribute on each button", () => {
    const html = renderToString(
      <WidgetPalette availableWidgets={[fakeDefinition]} />,
    );
    assertStringIncludes(html, "data-add-widget");
    assertStringIncludes(html, 'data-widget-type="hero"');
  });

  it("should render icon and label for widgets with icon", () => {
    const html = renderToString(
      <WidgetPalette availableWidgets={[fakeDefinition]} />,
    );
    assertStringIncludes(html, "\u{1F3AF}");
    assertStringIncludes(html, "Hero Banner");
  });

  it("should render label without icon span for widgets without icon", () => {
    const html = renderToString(
      <WidgetPalette availableWidgets={[fakeDefinitionNoIcon]} />,
    );
    assertStringIncludes(html, "Rich Text");
  });

  it("should render description for each widget", () => {
    const html = renderToString(
      <WidgetPalette availableWidgets={[fakeDefinition]} />,
    );
    assertStringIncludes(html, "A hero section with heading and CTA");
  });
});

// --- BuilderWidgetCard ---
describe("BuilderWidgetCard component", () => {
  it("should render data-widget-id on root div", () => {
    const html = renderToString(
      <BuilderWidgetCard widget={fakeWidget} definition={fakeDefinition} />,
    );
    assertStringIncludes(html, 'data-widget-id="w-001"');
  });

  it("should render drag handle with data-drag-handle", () => {
    const html = renderToString(
      <BuilderWidgetCard widget={fakeWidget} definition={fakeDefinition} />,
    );
    assertStringIncludes(html, "data-drag-handle");
  });

  it("should render edit and delete buttons", () => {
    const html = renderToString(
      <BuilderWidgetCard widget={fakeWidget} definition={fakeDefinition} />,
    );
    assertStringIncludes(html, "Editar");
    assertStringIncludes(html, "Excluir");
  });

  it("should render icon+label when definition has icon", () => {
    const html = renderToString(
      <BuilderWidgetCard widget={fakeWidget} definition={fakeDefinition} />,
    );
    assertStringIncludes(html, "\u{1F3AF}");
    assertStringIncludes(html, "Hero Banner");
  });

  it("should render widget type when definition is null", () => {
    const html = renderToString(
      <BuilderWidgetCard widget={fakeWidgetUnknown} definition={null} />,
    );
    assertStringIncludes(html, "custom:unknown-type");
  });

  it("should render data summary from widget data", () => {
    const html = renderToString(
      <BuilderWidgetCard widget={fakeWidget} definition={fakeDefinition} />,
    );
    assertStringIncludes(html, "heading: Welcome");
  });
});

// --- PageBuilderEditor ---
describe("PageBuilderEditor component", () => {
  it("should render 3-column layout (palette, canvas, properties)", () => {
    const html = renderToString(
      <PageBuilderEditor
        pageId="p-1"
        pageTitle="Home"
        placeholders={{ main: [] }}
        availableWidgets={[fakeDefinition]}
      />,
    );
    // Palette: aside with Widgets title
    assertStringIncludes(html, "Widgets");
    // Canvas: main with builder-canvas id
    assertStringIncludes(html, "builder-canvas");
    // Properties panel: aside with Propriedades
    assertStringIncludes(html, "Propriedades");
  });

  it("should render placeholder sections with titles", () => {
    const html = renderToString(
      <PageBuilderEditor
        pageId="p-1"
        pageTitle="Home"
        placeholders={{ main: [], sidebar: [] }}
        availableWidgets={[fakeDefinition]}
      />,
    );
    assertStringIncludes(html, "main");
    assertStringIncludes(html, "sidebar");
  });

  it("should render widgets inside canvas placeholders", () => {
    const html = renderToString(
      <PageBuilderEditor
        pageId="p-1"
        pageTitle="Home"
        placeholders={{ main: [fakeWidget] }}
        availableWidgets={[fakeDefinition]}
      />,
    );
    assertStringIncludes(html, 'data-widget-id="w-001"');
    assertStringIncludes(html, "Hero Banner");
  });

  it("should show empty message when placeholder has no widgets", () => {
    const html = renderToString(
      <PageBuilderEditor
        pageId="p-1"
        pageTitle="Home"
        placeholders={{ main: [] }}
        availableWidgets={[fakeDefinition]}
      />,
    );
    assertStringIncludes(html, "Nenhum widget neste placeholder");
  });

  it("should show no-placeholder message when placeholders is empty", () => {
    const html = renderToString(
      <PageBuilderEditor
        pageId="p-1"
        pageTitle="Home"
        placeholders={{}}
        availableWidgets={[fakeDefinition]}
      />,
    );
    assertStringIncludes(html, "Nenhum placeholder encontrado");
  });

  it("should render breadcrumb with page title", () => {
    const html = renderToString(
      <PageBuilderEditor
        pageId="p-1"
        pageTitle="About Us"
        placeholders={{ main: [] }}
        availableWidgets={[fakeDefinition]}
      />,
    );
    assertStringIncludes(html, "About Us");
    assertStringIncludes(html, "Builder");
    assertStringIncludes(html, 'aria-label="Breadcrumb"');
  });

  it("should render data-page-id on canvas", () => {
    const html = renderToString(
      <PageBuilderEditor
        pageId="p-42"
        pageTitle="Contact"
        placeholders={{ main: [] }}
        availableWidgets={[]}
      />,
    );
    assertStringIncludes(html, 'data-page-id="p-42"');
  });
});

// --- BuilderLayout ---
describe("BuilderLayout component", () => {
  it("should include Sortable.js CDN script tag", () => {
    const html = renderToString(
      <BuilderLayout pageId="p-1" pageTitle="Home">
        <div>content</div>
      </BuilderLayout>,
    );
    assertStringIncludes(html, "sortablejs");
    assertStringIncludes(html, "Sortable.min.js");
  });

  it("should render <title> element", () => {
    const html = renderToString(
      <BuilderLayout pageId="p-1" pageTitle="Home">
        <div>content</div>
      </BuilderLayout>,
    );
    assertStringIncludes(html, "<title>");
  });

  it("should render children inside body", () => {
    const html = renderToString(
      <BuilderLayout pageId="p-1" pageTitle="Test">
        <div data-testid="child">Hello</div>
      </BuilderLayout>,
    );
    assertStringIncludes(html, "Hello");
  });

  it("should include Tailwind CSS CDN script", () => {
    const html = renderToString(
      <BuilderLayout pageId="p-1">
        <div>x</div>
      </BuilderLayout>,
    );
    assertStringIncludes(html, "tailwindcss");
  });

  it("should render html lang=en", () => {
    const html = renderToString(
      <BuilderLayout pageId="p-1">
        <div>x</div>
      </BuilderLayout>,
    );
    assertStringIncludes(html, 'lang="en"');
  });
});
