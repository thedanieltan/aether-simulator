import {
  scenarioCatalogFromLibrary,
  scenarioLibrary,
} from "../src/scenarios/library.mjs";

export const scenarioCatalog = scenarioCatalogFromLibrary(scenarioLibrary);

export function workerRequest(worker, command, payload = {}, options = {}) {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener("message", handle);
      worker.removeEventListener("error", fail);
      worker.removeEventListener("messageerror", failMessage);
      options.signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("The simulation was cancelled.", "AbortError"));
    };
    const handle = (event) => {
      if (event.data.requestId !== requestId) return;
      if (event.data.progress) {
        options.onProgress?.(event.data.progress);
        return;
      }
      cleanup();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    const fail = (event) => {
      cleanup();
      reject(new Error(event.message || "The local simulation worker failed."));
    };
    const failMessage = () => {
      cleanup();
      reject(new Error("The local simulation worker returned an unreadable message."));
    };
    if (options.signal?.aborted) {
      abort();
      return;
    }
    worker.addEventListener("message", handle);
    worker.addEventListener("error", fail);
    worker.addEventListener("messageerror", failMessage);
    options.signal?.addEventListener("abort", abort, { once: true });
    worker.postMessage({ requestId, command, payload });
  });
}

export function canonicalDownload(name, value) {
  textDownload(name, `${JSON.stringify(value, null, 2)}\n`);
}

export function textDownload(name, text) {
  const blob = new Blob([text], {
    type: "application/json",
  });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export function evidenceEnvelope(exported) {
  const observations = exported?.world?.observations ?? [];
  return {
    contract_version: "aether-browser-evidence.v1",
    provenance: {
      origin: "deterministic-browser-adapter",
      synthetic: true,
      authoritative: false,
    },
    status: "quarantined",
    facts: observations
      .filter(({ kind }) => kind.includes("lineage"))
      .map(({ id, kind, attributes }) => ({ id, kind, attributes })),
  };
}
