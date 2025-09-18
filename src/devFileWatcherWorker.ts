import { debounce } from "@std/async/debounce";

self.onmessage = async () => {
  let watcher = Deno.watchFs("./app");
  for await (const event of watcher) {
    console.log(">>>> event", event);
    watcher.close();
  }
  const call = debounce((event: Deno.FsEvent) => {
    console.log("[%s] %s", event.kind, event.paths[0]);
    self.postMessage(event);
  }, 200);

  watcher = Deno.watchFs("./app");

  for await (const event of watcher) {
    call(event);
  }
};
