import assert from "node:assert/strict";
import test from "node:test";
import { workerRequest } from "../app/adapter.mjs";
import {
  assertBrowserWorkload,
  BROWSER_RUNTIME_ENVELOPE,
  estimateBrowserWorkload,
} from "../app/runtime-control.mjs";

test("browser workload estimates are deterministic and grounded in benchmarked scales", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(BROWSER_RUNTIME_ENVELOPE).map(([depth, value]) => [
        depth,
        value.maximumScale,
      ]),
    ),
    { enterprise: 100, ecosystem: 10, economy: 25 },
  );
  assert.deepEqual(
    estimateBrowserWorkload({
      depth: "economy",
      scale: 25,
      duration: 80,
    }),
    estimateBrowserWorkload({
      depth: "economy",
      scale: 25,
      duration: 80,
    }),
  );
  assert.equal(
    estimateBrowserWorkload({
      depth: "ecosystem",
      scale: 1,
      duration: 80,
    }).estimatedEventUnits,
    46,
  );
});

test("interactive envelope rejects unsupported browser workloads without capping the kernel", () => {
  assert.doesNotThrow(() =>
    assertBrowserWorkload({ depth: "enterprise", scale: 100, duration: 80 }),
  );
  assert.throws(
    () => assertBrowserWorkload({ depth: "ecosystem", scale: 11, duration: 80 }),
    /local CLI/,
  );
  assert.throws(
    () => assertBrowserWorkload({ depth: "economy", scale: 1, duration: 81 }),
    /duration up to 80/,
  );
  assert.throws(
    () => estimateBrowserWorkload({ depth: "economy", scale: 0, duration: 80 }),
    /positive safe integer/,
  );
});

class FakeWorker extends EventTarget {
  posted = null;

  postMessage(message) {
    this.posted = message;
  }

  respond(data) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

test("worker request reports coarse progress and resolves its matching result", async () => {
  const worker = new FakeWorker();
  const progress = [];
  const request = workerRequest(worker, "run", { seed: "synthetic" }, {
    onProgress: (update) => progress.push(update),
  });
  worker.respond({
    requestId: worker.posted.requestId,
    progress: { phase: "executing", value: 35 },
  });
  worker.respond({
    requestId: worker.posted.requestId,
    ok: true,
    result: { digest: "deterministic" },
  });
  assert.deepEqual(await request, { digest: "deterministic" });
  assert.deepEqual(progress, [{ phase: "executing", value: 35 }]);
});

test("worker request aborts immediately and ignores later worker output", async () => {
  const worker = new FakeWorker();
  const controller = new AbortController();
  const request = workerRequest(worker, "run", {}, { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  worker.respond({
    requestId: worker.posted.requestId,
    ok: true,
    result: { ignored: true },
  });
});

test("worker request rejects worker crashes and unreadable messages", async () => {
  const crashedWorker = new FakeWorker();
  const crashed = workerRequest(crashedWorker, "run");
  const crash = new Event("error");
  Object.defineProperty(crash, "message", { value: "synthetic worker crash" });
  crashedWorker.dispatchEvent(crash);
  await assert.rejects(crashed, /synthetic worker crash/);

  const unreadableWorker = new FakeWorker();
  const unreadable = workerRequest(unreadableWorker, "run");
  unreadableWorker.dispatchEvent(new Event("messageerror"));
  await assert.rejects(unreadable, /unreadable message/);
});
