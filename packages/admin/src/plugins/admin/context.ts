import type { Plugin } from "@leproj/tennet";
import type {
  BlogRouteRegistry,
  DynamicRouteRegistry,
  WidgetPageRenderer,
} from "@leproj/tennet";
import type { SessionStore } from "../../auth/sessionStore.ts";
import type { UserStore } from "../../auth/userStore.ts";
import type { AuditLogPlugin } from "../auditLogPlugin.ts";
import type { MediaStore } from "./mediaStore.ts";

/** Shared context passed to every admin sub-module. */
export interface AdminContext {
  kv: Deno.Kv | null;
  plugins: Plugin[];
  appPath: string;
  sessionStore: SessionStore;
  userStore: UserStore;
  dynamicRegistry?: DynamicRouteRegistry;
  blogRegistry?: BlogRouteRegistry;
  auditLogPlugin?: AuditLogPlugin;
  mediaStore?: MediaStore;
  widgetRenderer?: WidgetPageRenderer;
}
