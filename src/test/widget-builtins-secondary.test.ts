import { describe, it } from "@std/testing/bdd";
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { widgetRegistry } from "../widgets/widgetRegistry.ts";
import { ctaButtonWidget } from "../widgets/builtins/ctaButton.ts";
import { spacerWidget } from "../widgets/builtins/spacer.ts";
import { galleryWidget } from "../widgets/builtins/gallery.ts";
import { contactFormWidget } from "../widgets/builtins/contactForm.ts";
import { registerBuiltinWidgets } from "../widgets/builtins/index.ts";
import type { WidgetInstance } from "../widgets/types.ts";

/** Helper: create a minimal WidgetInstance with overrides. */
function makeInstance(
  type: string,
  data: Record<string, unknown>,
): WidgetInstance {
  return {
    id: "test-id",
    type: type as WidgetInstance["type"],
    placeholder: "main",
    order: 0,
    data,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

// ── CTA Button ─────────────────────────────────────────────────────────────

describe("ctaButtonWidget", () => {
  it("should render with text and url", () => {
    const html = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "Click Me", url: "https://example.com" }),
    );
    assertStringIncludes(html, "Click Me");
    assertStringIncludes(html, 'href="https://example.com"');
    assertStringIncludes(html, "ten-widget-cta-button");
  });

  it("should sanitize javascript: URLs to empty string", () => {
    const html = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "XSS", url: "javascript:alert(1)" }),
    );
    assertStringIncludes(html, 'href=""');
    assert(!html.includes("javascript:"));
  });

  it("should sanitize data: URLs", () => {
    const html = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "XSS", url: "data:text/html,<script>alert(1)</script>" }),
    );
    assertStringIncludes(html, 'href=""');
  });

  it("should sanitize vbscript: URLs", () => {
    const html = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "XSS", url: "vbscript:MsgBox" }),
    );
    assertStringIncludes(html, 'href=""');
  });

  it("should escape HTML in text", () => {
    const html = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "<script>alert(1)</script>", url: "https://ok.com" }),
    );
    assert(!html.includes("<script>"));
    assertStringIncludes(html, "&lt;script&gt;");
  });

  it("should apply style classes for each style option", () => {
    const primary = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", style: "primary" }),
    );
    assertStringIncludes(primary, "bg-indigo-600");

    const secondary = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", style: "secondary" }),
    );
    assertStringIncludes(secondary, "bg-gray-100");

    const outline = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", style: "outline" }),
    );
    assertStringIncludes(outline, "border-indigo-600");

    const ghost = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", style: "ghost" }),
    );
    assertStringIncludes(ghost, "text-indigo-600");
    assertStringIncludes(ghost, "bg-transparent");
  });

  it("should apply size classes", () => {
    const sm = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", size: "sm" }),
    );
    assertStringIncludes(sm, "px-4 py-2 text-sm");

    const lg = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", size: "lg" }),
    );
    assertStringIncludes(lg, "px-8 py-4 text-lg");
  });

  it("should add target=_blank when new_tab=yes", () => {
    const html = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", new_tab: "yes" }),
    );
    assertStringIncludes(html, 'target="_blank"');
    assertStringIncludes(html, 'rel="noopener noreferrer"');
  });

  it("should NOT have target=_blank when new_tab=no", () => {
    const html = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", new_tab: "no" }),
    );
    assert(!html.includes('target="_blank"'));
  });

  it("should apply alignment classes", () => {
    const left = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", alignment: "left" }),
    );
    assertStringIncludes(left, "text-left");

    const right = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", alignment: "right" }),
    );
    assertStringIncludes(right, "text-right");

    const center = ctaButtonWidget.render(
      makeInstance("cta-button", { text: "A", url: "/", alignment: "center" }),
    );
    assertStringIncludes(center, "text-center");
  });
});

// ── Spacer ──────────────────────────────────────────────────────────────────

describe("spacerWidget", () => {
  it("should render with height and unit", () => {
    const html = spacerWidget.render(
      makeInstance("spacer", { height: 60, unit: "px" }),
    );
    assertStringIncludes(html, "height:60px");
    assertStringIncludes(html, "ten-widget-spacer");
    assertStringIncludes(html, 'aria-hidden="true"');
  });

  it("should render with rem unit", () => {
    const html = spacerWidget.render(
      makeInstance("spacer", { height: 3, unit: "rem" }),
    );
    assertStringIncludes(html, "height:3rem");
  });

  it("should clamp height to minimum 1", () => {
    const html = spacerWidget.render(
      makeInstance("spacer", { height: 0, unit: "px" }),
    );
    assertStringIncludes(html, "height:1px");
  });

  it("should clamp height to maximum 500", () => {
    const html = spacerWidget.render(
      makeInstance("spacer", { height: 999, unit: "px" }),
    );
    assertStringIncludes(html, "height:500px");
  });

  it("should use default height 40 for NaN", () => {
    const html = spacerWidget.render(
      makeInstance("spacer", { height: "abc", unit: "px" }),
    );
    assertStringIncludes(html, "height:40px");
  });

  it("should fallback to px for invalid unit", () => {
    const html = spacerWidget.render(
      makeInstance("spacer", { height: 20, unit: "invalid" }),
    );
    assertStringIncludes(html, "height:20px");
  });

  it("should fallback to px for potentially dangerous unit", () => {
    const html = spacerWidget.render(
      makeInstance("spacer", { height: 20, unit: "vh" }),
    );
    assertStringIncludes(html, "height:20px");
  });
});

// ── Gallery ─────────────────────────────────────────────────────────────────

describe("galleryWidget", () => {
  it("should render with array of image URLs", () => {
    const urls = JSON.stringify(["https://img1.com/a.jpg", "https://img2.com/b.jpg"]);
    const html = galleryWidget.render(
      makeInstance("gallery", { images: urls }),
    );
    assertStringIncludes(html, "ten-widget-gallery");
    assertStringIncludes(html, 'src="https://img1.com/a.jpg"');
    assertStringIncludes(html, 'src="https://img2.com/b.jpg"');
  });

  it("should sanitize javascript: URLs in images", () => {
    const urls = JSON.stringify(["javascript:alert(1)", "https://safe.com/img.jpg"]);
    const html = galleryWidget.render(
      makeInstance("gallery", { images: urls }),
    );
    assert(!html.includes("javascript:"));
    assertStringIncludes(html, "https://safe.com/img.jpg");
  });

  it("should clamp columns to minimum 1", () => {
    const urls = JSON.stringify(["https://img.com/a.jpg"]);
    const html = galleryWidget.render(
      makeInstance("gallery", { images: urls, columns: 0 }),
    );
    assertStringIncludes(html, "grid-cols-1");
  });

  it("should clamp columns to maximum 6", () => {
    const urls = JSON.stringify(["https://img.com/a.jpg"]);
    const html = galleryWidget.render(
      makeInstance("gallery", { images: urls, columns: 10 }),
    );
    assertStringIncludes(html, "grid-cols-6");
  });

  it("should default to 3 columns", () => {
    const urls = JSON.stringify(["https://img.com/a.jpg"]);
    const html = galleryWidget.render(
      makeInstance("gallery", { images: urls }),
    );
    assertStringIncludes(html, "grid-cols-3");
  });

  it("should add lightbox data attributes when lightbox=yes", () => {
    const urls = JSON.stringify(["https://img.com/a.jpg"]);
    const html = galleryWidget.render(
      makeInstance("gallery", { images: urls, lightbox: "yes" }),
    );
    assertStringIncludes(html, 'target="_blank"');
    assertStringIncludes(html, "<a ");
  });

  it("should NOT have links when lightbox=no", () => {
    const urls = JSON.stringify(["https://img.com/a.jpg"]);
    const html = galleryWidget.render(
      makeInstance("gallery", { images: urls, lightbox: "no" }),
    );
    assert(!html.includes("<a "));
  });

  it("should render empty gallery for invalid JSON", () => {
    const html = galleryWidget.render(
      makeInstance("gallery", { images: "not-json" }),
    );
    assertStringIncludes(html, "ten-widget-gallery");
    assert(!html.includes("<img"));
  });

  it("should apply gap classes", () => {
    const urls = JSON.stringify(["https://img.com/a.jpg"]);

    const sm = galleryWidget.render(
      makeInstance("gallery", { images: urls, gap: "sm" }),
    );
    assertStringIncludes(sm, "gap-2");

    const lg = galleryWidget.render(
      makeInstance("gallery", { images: urls, gap: "lg" }),
    );
    assertStringIncludes(lg, "gap-6");
  });
});

// ── Contact Form ────────────────────────────────────────────────────────────

describe("contactFormWidget", () => {
  it("should render with title", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", {
        title: "Fale Conosco",
        email_to: "test@example.com",
      }),
    );
    assertStringIncludes(html, "Fale Conosco");
    assertStringIncludes(html, "ten-widget-contact-form");
  });

  it("should NOT expose email_to in rendered HTML", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", {
        title: "Contact",
        email_to: "secret@example.com",
      }),
    );
    assert(!html.includes("secret@example.com"));
  });

  it("should render form with action=/api/contact", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", { email_to: "a@b.com" }),
    );
    assertStringIncludes(html, 'action="/api/contact"');
    assertStringIncludes(html, 'method="POST"');
  });

  it("should render default fields (name, email, message)", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", { email_to: "a@b.com" }),
    );
    assertStringIncludes(html, 'name="name"');
    assertStringIncludes(html, 'name="email"');
    assertStringIncludes(html, 'name="message"');
  });

  it("should render extra fields from JSON", () => {
    const fields = JSON.stringify([
      { name: "company", label: "Empresa" },
      { name: "phone", label: "Telefone" },
    ]);
    const html = contactFormWidget.render(
      makeInstance("contact-form", {
        email_to: "a@b.com",
        fields,
      }),
    );
    assertStringIncludes(html, 'name="company"');
    assertStringIncludes(html, "Empresa");
    assertStringIncludes(html, 'name="phone"');
    assertStringIncludes(html, "Telefone");
  });

  it("should render custom submit label", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", {
        email_to: "a@b.com",
        submit_label: "Send Now",
      }),
    );
    assertStringIncludes(html, "Send Now");
  });

  it("should default submit label to Enviar", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", { email_to: "a@b.com" }),
    );
    assertStringIncludes(html, "Enviar");
  });

  it("should escape HTML in title", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", {
        title: "<img src=x onerror=alert(1)>",
        email_to: "a@b.com",
      }),
    );
    assert(!html.includes("<img src=x"));
    assertStringIncludes(html, "&lt;img");
  });

  it("should handle invalid JSON in extra fields gracefully", () => {
    const html = contactFormWidget.render(
      makeInstance("contact-form", {
        email_to: "a@b.com",
        fields: "{invalid",
      }),
    );
    // Should still render the form without extra fields
    assertStringIncludes(html, 'action="/api/contact"');
  });

  it("should render textarea type for extra fields", () => {
    const fields = JSON.stringify([
      { name: "notes", label: "Notes", type: "textarea" },
    ]);
    const html = contactFormWidget.render(
      makeInstance("contact-form", { email_to: "a@b.com", fields }),
    );
    assertStringIncludes(html, "<textarea");
    assertStringIncludes(html, 'name="notes"');
  });
});

// ── registerBuiltinWidgets ──────────────────────────────────────────────────

describe("registerBuiltinWidgets", () => {
  it("should register all 7 built-in widgets", () => {
    registerBuiltinWidgets();
    const all = widgetRegistry.all();
    const types = all.map((d) => d.type);

    // Original 3
    assert(types.includes("hero"), "should include hero");
    assert(types.includes("rich-text"), "should include rich-text");
    assert(types.includes("image"), "should include image");

    // New 4
    assert(types.includes("cta-button"), "should include cta-button");
    assert(types.includes("spacer"), "should include spacer");
    assert(types.includes("gallery"), "should include gallery");
    assert(types.includes("contact-form"), "should include contact-form");

    // Total count: at least 7 (may include others registered in other tests)
    assert(all.length >= 7, `expected at least 7 widgets, got ${all.length}`);
  });

  it("should be idempotent (safe to call multiple times)", () => {
    registerBuiltinWidgets();
    const count1 = widgetRegistry.all().length;
    registerBuiltinWidgets();
    const count2 = widgetRegistry.all().length;
    assertEquals(count1, count2);
  });
});
