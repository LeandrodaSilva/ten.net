import { Plugin, type PluginModel } from "@leproj/tennet";

export class SettingsPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "SettingsPlugin";
    this.description = "Configure application settings.";
    this.model = {
      key: "string",
      value: "string",
    };
  }
}
