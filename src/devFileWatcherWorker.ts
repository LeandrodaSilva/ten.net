import { debounce } from "@std/async/debounce";

interface WorkerGlobalScope {
  onerror: (this: WorkerGlobalScope, ev: ErrorEvent) => any;
}

interface DedicatedWorkerGlobalScope extends WorkerGlobalScope {
  onmessage: (this: DedicatedWorkerGlobalScope, ev: MessageEvent) => any;
  postMessage: (message: any) => void;
}

//define types globally of onmessage and postMessage
declare const self: {
  onmessage: (this: DedicatedWorkerGlobalScope, ev: MessageEvent) => any;
  postMessage: (message: any) => void;
};

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
