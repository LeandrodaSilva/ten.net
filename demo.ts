import { Ten } from "./src/mod.ts";
import {
  AdminPlugin,
  AuditLogPlugin,
  CategoriesPlugin,
  GroupsPlugin,
  PagePlugin,
  PostsPlugin,
  RolesPlugin,
  SettingsPlugin,
  UsersPlugin,
} from "./src/admin/mod.ts";

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
      ],
    }),
  );
  await app.start();
}
