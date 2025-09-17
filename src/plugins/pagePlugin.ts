import {Plugin, PluginModel} from "../models/Plugin.ts";

export class PagePlugin extends Plugin {
	name: string;
	description: string;
	model: PluginModel;

	constructor() {
		super();
		this.name = "PagePlugin";
		this.description = "A plugin for handling page rendering.";
		this.model = {
			name: "string",
			html: "string",
		};
	}
}