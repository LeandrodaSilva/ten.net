import { Plugin, type PluginModel } from "@leproj/tennet";

export class GroupsPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "GroupPlugin";
    this.description = "Create curated content collections.";
    this.model = {
      name: "string",
      slug: "string",
      description: "string",
      item_ids: "object",
    };
  }
}
