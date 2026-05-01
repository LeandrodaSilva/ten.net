import { Ten } from "@leproj/tennet";

const app = Ten.net({ appPath: "./example/todo-app/app" });
await app.start();
