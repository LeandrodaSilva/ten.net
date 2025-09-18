import { Plugin, type PluginModel } from "../models/Plugin.ts";

export class AdminPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "AdminPlugin";
    this.description = "A plugin for handling page rendering.";
    this.model = {
      name: "string",
      html: "string",
    };
  }
}
