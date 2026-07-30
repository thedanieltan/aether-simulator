export const SCENARIO_LIBRARY_CONTRACT = "aether-scenario-library.v1";

const definitions = {
  enterprise: [
    ["professional-services-customer-engagement", "Professional services", "Trace a fictional client engagement across people, work, finance, and lineage."],
    ["saas-customer-lifecycle", "Software service", "Follow a synthetic subscription lifecycle from activation through its declared outcome."],
    ["retail-intervention-baseline", "Retail", "Inspect inventory, order, payment, fulfilment, and intervention effects in one retailer."],
    ["logistics-delivery-exception", "Logistics", "Trace a declared delivery exception, operational failure, and remediation."],
    ["manufacturing-production-order", "Manufacturing", "Follow a production order through capacity, inventory, workflow, and finance."],
  ],
  ecosystem: [
    ["saas-service-network", "Service network", "Model declared service organizations, contracts, payments, and shared citizen contexts."],
    ["retail-supply-network", "Retail supply network", "Trace supplier, retailer, logistics, finance, and customer interactions."],
    ["vendor-outage-cascade", "Vendor outage cascade", "Inspect an explicit cross-organization outage ancestry chain."],
    ["cross-organization-data-request", "Cross-organization data request", "Follow a synthetic record request and lineage across declared boundaries."],
    ["ecosystem-intervention-baseline", "Capacity intervention", "Compare a declared network-capacity intervention with its deterministic baseline."],
  ],
  economy: [
    ["stable-baseline", "Stable baseline", "Run households, firms, banks, government, markets, employment, and consumption."],
    ["demand-shock-recovery", "Demand shock and recovery", "Inspect a simplified declared demand shock and recovery path."],
    ["supply-chain-shock", "Supply-chain shock", "Trace synthetic production and market effects from a declared supply disruption."],
    ["credit-tightening-default", "Credit tightening and default", "Inspect simplified credit contraction, repayment, and default mechanisms."],
    ["policy-intervention-baseline", "Policy intervention", "Run the tested fixed-baseline household-transfer experiment family."],
    ["major-employer-failure", "Major employer failure", "Trace employment and transaction effects after a declared employer failure."],
  ],
};

export const scenarioLibrary = Object.freeze({
  contract_version: SCENARIO_LIBRARY_CONTRACT,
  entries: Object.freeze(
    Object.entries(definitions).flatMap(([depth, entries]) =>
      entries.map(([scenario, label, summary], index) => Object.freeze({
        scenario_id: scenario,
        depth,
        label,
        summary,
        recommended: index === 0 || scenario === "retail-intervention-baseline",
        synthetic: true,
        authoritative: false,
        status: "research-preview",
        tags: Object.freeze(scenario.split("-")),
      }))),
  ),
});

export function scenarioCatalogFromLibrary(library = scenarioLibrary) {
  if (library?.contract_version !== SCENARIO_LIBRARY_CONTRACT) {
    throw new TypeError("a versioned scenario library is required");
  }
  const catalog = { enterprise: [], ecosystem: [], economy: [] };
  const seen = new Set();
  for (const entry of library.entries) {
    const key = `${entry.depth}/${entry.scenario_id}`;
    if (!catalog[entry.depth] || seen.has(key)) {
      throw new TypeError(`invalid or duplicate scenario library entry: ${key}`);
    }
    seen.add(key);
    catalog[entry.depth].push([entry.scenario_id, entry.label]);
  }
  return catalog;
}

export function filterScenarioLibrary(
  { depth = "all", query = "" } = {},
  library = scenarioLibrary,
) {
  scenarioCatalogFromLibrary(library);
  const normalizedQuery = String(query).trim().toLowerCase();
  return library.entries.filter((entry) =>
    (depth === "all" || entry.depth === depth)
    && `${entry.label} ${entry.summary} ${entry.tags.join(" ")}`
      .toLowerCase()
      .includes(normalizedQuery));
}

export const guidedFirstRun = Object.freeze({
  depth: "enterprise",
  scenario: "retail-intervention-baseline",
  seed: "guided-enterprise-1",
  scale: 1,
  duration: 80,
  intervention: 12,
});

