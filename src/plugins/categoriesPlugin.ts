import { Plugin, type PluginModel } from "../models/Plugin.ts";

export class CategoriesPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "CategoryPlugin";
    this.description = "Organize content with categories.";
    this.model = {
      name: "string",
      slug: "string",
      description: "string",
    };
  }
}
