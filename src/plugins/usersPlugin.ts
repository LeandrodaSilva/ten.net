import { Plugin, type PluginModel } from "../models/Plugin.ts";

export class UsersPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "UserPlugin";
    this.description = "Manage users and permissions.";
    this.model = {
      email: "string",
      display_name: "string",
      role: "string",
      status: "string",
    };
  }
}
