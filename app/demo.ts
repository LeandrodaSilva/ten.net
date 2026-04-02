import { Ten } from "../packages/core/src/mod.ts";
import {
  AdminPlugin,
  AuditLogPlugin,
  CategoriesPlugin,
  GroupsPlugin,
  MediaPlugin,
  PagePlugin,
  PostsPlugin,
  RolesPlugin,
  SettingsPlugin,
  UsersPlugin,
} from "../packages/admin/src/mod.ts";

if (import.meta.main) {
  const app = Ten.net();
  await app.useAdmin(
    new AdminPlugin({
      plugins: [
        PagePlugin,
        PostsPlugin,
        CategoriesPlugin,
        GroupsPlugin,
        UsersPlugin,
        SettingsPlugin,
        RolesPlugin,
        AuditLogPlugin,
        MediaPlugin,
      ],
    }),
  );
  await app.start();
}
