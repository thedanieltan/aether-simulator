import { BrowserSimulationRuntime } from "./runtime.mjs";

const runtime = new BrowserSimulationRuntime();

self.addEventListener("message", ({ data }) => {
  const { requestId, command, payload } = data;
  try {
    const result = runtime.execute(command, payload);
    self.postMessage({ requestId, ok: true, result });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
