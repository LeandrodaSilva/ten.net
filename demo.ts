import { Ten } from "./src/mod.ts";
import {
  AdminPlugin,
  CategoriesPlugin,
  GroupsPlugin,
  PagePlugin,
  PostsPlugin,
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
      ],
    }),
  );
  await app.start();
}
