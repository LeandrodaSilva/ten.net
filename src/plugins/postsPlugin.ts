import { Plugin, type PluginModel } from "../models/Plugin.ts";

export class PostsPlugin extends Plugin {
  name: string;
  description: string;
  model: PluginModel;

  constructor() {
    super();
    this.name = "PostPlugin";
    this.description = "Manage blog posts and content.";
    this.model = {
      title: "string",
      slug: "string",
      excerpt: "string",
      body: "string",
      cover_image: "string",
      status: "string",
      category_ids: "object",
      author_id: "string",
    };
  }
}
