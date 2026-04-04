import type { AppManifest } from "../../src/build/manifest.ts";

export interface DemoFile {
  name: string;
  content: string;
  language: "typescript" | "html";
  editable: boolean;
}

export interface Demo {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  files: DemoFile[];
  manifest: AppManifest;
  previewPath: string;
}

export type DemoCategory =
  | "routing"
  | "templates"
  | "forms"
  | "showcase"
  | "offline";

export interface CategoryMeta {
  id: DemoCategory;
  label: string;
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "routing", label: "Routing", icon: "route" },
  { id: "templates", label: "Templates", icon: "web" },
  { id: "forms", label: "Forms", icon: "edit_note" },
  { id: "showcase", label: "Showcase", icon: "star" },
  { id: "offline", label: "Offline / SW", icon: "cloud_off" },
];
