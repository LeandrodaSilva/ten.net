/**
 * Admin module for Ten.net — optional admin dashboard with CRUD, auth, and plugin management.
 *
 * @example
 * ```typescript
 * import { Ten } from "@leproj/tennet";
 * import { AdminPlugin, PagePlugin, PostsPlugin } from "@leproj/tennet/admin";
 *
 * const app = Ten.net();
 * await app.useAdmin(new AdminPlugin({
 *   plugins: [PagePlugin, PostsPlugin],
 * }));
 * await app.start();
 * ```
 *
 * @module
 */

// Admin orchestrator
export { AdminPlugin } from "./plugins/adminPlugin.tsx";
export type { AdminPluginOptions } from "./plugins/adminPlugin.tsx";

// Content plugins
export { PagePlugin } from "./plugins/pagePlugin.ts";
export { PostsPlugin } from "./plugins/postsPlugin.ts";
export { CategoriesPlugin } from "./plugins/categoriesPlugin.ts";
export { GroupsPlugin } from "./plugins/groupsPlugin.ts";
export { UsersPlugin } from "./plugins/usersPlugin.ts";
export { SettingsPlugin } from "./plugins/settingsPlugin.ts";
export { RolesPlugin } from "./plugins/rolesPlugin.ts";
export { AuditLogPlugin } from "./plugins/auditLogPlugin.ts";
export { MediaPlugin } from "./plugins/mediaPlugin.ts";

// Base for custom plugins
export { Plugin } from "@leproj/tennet";
export type { PluginModel } from "@leproj/tennet";
