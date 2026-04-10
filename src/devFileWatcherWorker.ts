import { debounce } from "@std/async/debounce";

interface WorkerGlobalScope {
  onerror: (this: WorkerGlobalScope, ev: ErrorEvent) => void;
}

interface DedicatedWorkerGlobalScope extends WorkerGlobalScope {
  onmessage: (this: DedicatedWorkerGlobalScope, ev: MessageEvent) => void;
  postMessage: (
    message: { kind: string; path?: string; error?: string },
  ) => void;
}

interface WatcherMessage {
  action?: "start";
  appPath?: string;
}

declare const self: {
  onmessage: (this: DedicatedWorkerGlobalScope, ev: MessageEvent) => void;
  postMessage: (
    message: { kind: string; path?: string; error?: string },
  ) => void;
};

self.onmessage = async (message) => {
  const data = message.data as WatcherMessage;
  const appPath = data.appPath ?? "./app";

  const call = debounce((event: Deno.FsEvent) => {
    self.postMessage({ kind: event.kind, path: event.paths[0] });
  }, 200);

  try {
    const watcher = Deno.watchFs(appPath);
    for await (const event of watcher) {
      call(event);
    }
  } catch (error) {
    self.postMessage({
      kind: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
