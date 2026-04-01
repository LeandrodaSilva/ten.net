/**
 * Widget system types for Ten.net.
 *
 * Widgets are content blocks that can be placed into named placeholders
 * on a page. Each page can have multiple placeholders, each containing
 * an ordered list of WidgetInstances.
 */

/** Built-in widget types provided by the framework. */
export type BuiltinWidgetType =
  | "hero"
  | "rich-text"
  | "image"
  | "gallery"
  | "contact-form"
  | "cta-button"
  | "spacer"
  | "html"
  | "embed"
  | "columns";

/** A widget type — either built-in or a custom prefixed type. */
export type WidgetType = BuiltinWidgetType | `custom:${string}`;

/**
 * A concrete widget instance stored in KV.
 * Key layout: ["widgets", pageId, "instance", widgetId]
 */
export interface WidgetInstance {
  /** Unique identifier for this instance (UUID). */
  id: string;
  /** The widget type (built-in or custom). */
  type: WidgetType;
  /** The placeholder slot this widget belongs to. */
  placeholder: string;
  /** Position within the placeholder (0-based). */
  order: number;
  /** Widget field values as key→value pairs. */
  data: Record<string, unknown>;
  /** ISO 8601 timestamp of creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

/**
 * Schema for a single editable field within a widget.
 */
export interface WidgetFieldSchema {
  /** Internal field name (used as key in WidgetInstance.data). */
  name: string;
  /** Human-readable label shown in the editor. */
  label: string;
  /** Field input type. */
  type:
    | "text"
    | "textarea"
    | "rich-text"
    | "image"
    | "url"
    | "select"
    | "number";
  /** Whether this field must have a value. */
  required?: boolean;
  /** Options for "select" type fields. */
  options?: string[];
  /** Default value for the field. */
  default?: unknown;
}

/**
 * Context passed to a widget's render function.
 * Carries the full PlaceholderMap for widgets that need to render sub-widgets
 * (e.g. the "columns" widget).
 */
export interface WidgetRenderContext {
  /** Full page placeholder map, used to render nested/child widgets. */
  subWidgets?: PlaceholderMap;
}

/**
 * A widget definition — registered in WidgetRegistry.
 * Describes a widget type, its fields, and how to render it.
 */
export interface WidgetDefinition {
  /** The widget type identifier. */
  type: WidgetType;
  /** Human-readable label for admin UI. */
  label: string;
  /** Short description of what this widget does. */
  description: string;
  /** Optional icon identifier or emoji for the admin palette. */
  icon?: string;
  /** Field schemas describing editable content. */
  fields: WidgetFieldSchema[];
  /** Whether this widget type is restricted to certain roles. */
  restricted?: boolean;
  /**
   * Render the widget to an HTML string.
   * Receives the widget instance data and an optional render context.
   */
  render(instance: WidgetInstance, context?: WidgetRenderContext): string;
  /** Default placeholder name if not specified when inserting. */
  defaultPlaceholder?: string;
}

/**
 * A map of placeholder name → ordered list of widget instances.
 * Used to represent all widget content for a given page.
 */
export type PlaceholderMap = Record<string, WidgetInstance[]>;

/**
 * Full widget layout for a page, indexed by pageId.
 */
export interface PageLayout {
  /** The page identifier this layout belongs to. */
  pageId: string;
  /** All placeholders and their widget instances. */
  placeholders: PlaceholderMap;
}
