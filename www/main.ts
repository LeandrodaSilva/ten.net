import { Ten } from "@leproj/tennet";

const app = Ten.net({ appPath: "./www/app" });
await app.start();
