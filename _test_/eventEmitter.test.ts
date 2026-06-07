import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { EventEmitter } from "../src/core/eventEmitter.ts";

function silenceErrors<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  return fn().finally(() => {
    console.error = original;
  });
}

describe("EventEmitter", () => {
  it("invokes a listener with the emitted arguments", async () => {
    const emitter = new EventEmitter();
    let received: unknown[] = [];
    emitter.on("evt", (...args) => {
      received = args;
    });

    await emitter.emit("evt", "a", 1, true);
    assertEquals(received, ["a", 1, true]);
  });

  it("invokes multiple listeners in registration order", async () => {
    const emitter = new EventEmitter();
    const order: number[] = [];
    emitter.on("evt", () => {
      order.push(1);
    });
    emitter.on("evt", () => {
      order.push(2);
    });

    await emitter.emit("evt");
    assertEquals(order, [1, 2]);
  });

  it("awaits async listeners sequentially", async () => {
    const emitter = new EventEmitter();
    const order: string[] = [];
    emitter.on("evt", async () => {
      await new Promise((r) => setTimeout(r, 5));
      order.push("first");
    });
    emitter.on("evt", () => {
      order.push("second");
    });

    await emitter.emit("evt");
    assertEquals(order, ["first", "second"]);
  });

  it("removes a once listener after the first emit", async () => {
    const emitter = new EventEmitter();
    let count = 0;
    emitter.once("evt", () => {
      count++;
    });

    await emitter.emit("evt");
    await emitter.emit("evt");
    assertEquals(count, 1);
    assertEquals(emitter.listenerCount("evt"), 0);
  });

  it("removes a listener by reference with off()", async () => {
    const emitter = new EventEmitter();
    let count = 0;
    const listener = () => {
      count++;
    };
    emitter.on("evt", listener);
    emitter.off("evt", listener);

    await emitter.emit("evt");
    assertEquals(count, 0);
    assertEquals(emitter.listenerCount("evt"), 0);
  });

  it("off() on an unknown event is a no-op", () => {
    const emitter = new EventEmitter();
    emitter.off("missing", () => {});
    assertEquals(emitter.listenerCount("missing"), 0);
  });

  it("removeAllListeners clears one event or all events", () => {
    const emitter = new EventEmitter();
    emitter.on("a", () => {});
    emitter.on("b", () => {});

    emitter.removeAllListeners("a");
    assertEquals(emitter.listenerCount("a"), 0);
    assertEquals(emitter.listenerCount("b"), 1);

    emitter.removeAllListeners();
    assertEquals(emitter.listenerCount("b"), 0);
    assertEquals(emitter.eventNames(), []);
  });

  it("reports listenerCount and eventNames", () => {
    const emitter = new EventEmitter();
    emitter.on("a", () => {});
    emitter.on("a", () => {});
    emitter.on("b", () => {});

    assertEquals(emitter.listenerCount("a"), 2);
    assertEquals(emitter.eventNames().sort(), ["a", "b"]);
  });

  it("emitting an event with no listeners is a no-op", async () => {
    const emitter = new EventEmitter();
    await emitter.emit("nobody-listening", 1, 2, 3);
  });

  it("continues to other listeners when one throws", async () => {
    const emitter = new EventEmitter();
    let secondCalled = false;
    emitter.on("evt", () => {
      throw new Error("boom");
    });
    emitter.on("evt", () => {
      secondCalled = true;
    });

    await silenceErrors(() => emitter.emit("evt"));
    assertEquals(secondCalled, true);
  });

  it("uses a snapshot so listeners added during emit run on the next emit", async () => {
    const emitter = new EventEmitter();
    const calls: string[] = [];
    emitter.on("evt", () => {
      calls.push("first");
      emitter.on("evt", () => {
        calls.push("late");
      });
    });

    await emitter.emit("evt");
    assertEquals(calls, ["first"]);

    await emitter.emit("evt");
    assertEquals(calls, ["first", "first", "late"]);
  });

  it("supports method chaining", () => {
    const emitter = new EventEmitter();
    const result = emitter.on("a", () => {}).once("b", () => {}).off(
      "a",
      () => {},
    );
    assertEquals(result, emitter);
  });
});
