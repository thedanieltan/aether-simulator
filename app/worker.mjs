import { BrowserSimulationRuntime } from "./runtime.mjs";

const runtime = new BrowserSimulationRuntime();

self.addEventListener("message", ({ data }) => {
  const { requestId, command, payload } = data;
  try {
    self.postMessage({
      requestId,
      progress: { phase: "accepted", value: 10, detail: "Request accepted by local worker." },
    });
    self.postMessage({
      requestId,
      progress: {
        phase: "executing",
        value: 35,
        detail: "Running the deterministic kernel as one synchronous phase.",
      },
    });
    const result = runtime.execute(command, payload);
    self.postMessage({
      requestId,
      progress: { phase: "validating", value: 90, detail: "Preparing the result boundary." },
    });
    self.postMessage({ requestId, ok: true, result });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
