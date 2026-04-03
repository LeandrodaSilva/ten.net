import { Ten } from "@leproj/tennet";

const app = Ten.net({ appPath: "./example/http/app" });
await app.start();
