export const scenarioCatalog = {
  enterprise: [
    ["professional-services-customer-engagement", "Professional services"],
    ["saas-customer-lifecycle", "Software service"],
    ["retail-intervention-baseline", "Retail"],
    ["logistics-delivery-exception", "Logistics"],
    ["manufacturing-production-order", "Manufacturing"],
  ],
  ecosystem: [
    ["saas-service-network", "Service network"],
    ["retail-supply-network", "Retail supply network"],
    ["vendor-outage-cascade", "Vendor outage cascade"],
    ["cross-organization-data-request", "Cross-organization data request"],
    ["ecosystem-intervention-baseline", "Capacity intervention"],
  ],
  economy: [
    ["stable-baseline", "Stable baseline"],
    ["demand-shock-recovery", "Demand shock and recovery"],
    ["supply-chain-shock", "Supply-chain shock"],
    ["credit-tightening-default", "Credit tightening and default"],
    ["policy-intervention-baseline", "Policy intervention"],
    ["major-employer-failure", "Major employer failure"],
  ],
};

export function workerRequest(worker, command, payload = {}) {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const handle = (event) => {
      if (event.data.requestId !== requestId) return;
      worker.removeEventListener("message", handle);
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.addEventListener("message", handle);
    worker.postMessage({ requestId, command, payload });
  });
}

export function canonicalDownload(name, value) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
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
