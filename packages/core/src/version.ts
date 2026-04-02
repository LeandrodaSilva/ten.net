import denoJson from "../../../deno.json" with { type: "json" };

export const VERSION = denoJson.version as string;
