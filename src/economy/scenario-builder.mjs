import { stableId } from "../kernel/ids.mjs";
import { assertEconomyConfig } from "./validation.mjs";

const scenarioMechanisms = {
  "stable-baseline": { shock: "none", severity: 0, recovery: true, additional: [] },
  "demand-shock-recovery": {
    shock: "demand-contraction",
    severity: 3,
    recovery: true,
    additional: ["interest-rate-change"],
  },
  "supply-chain-shock": {
    shock: "supply-disruption",
    severity: 3,
    recovery: false,
    additional: ["labour-shortage", "energy-input-price-increase"],
  },
  "credit-tightening-default": {
    shock: "credit-tightening",
    severity: 4,
    recovery: false,
    additional: ["payment-system-outage"],
  },
  "policy-intervention-baseline": {
    shock: "tax-and-spending-change",
    severity: 2,
    recovery: true,
    additional: [],
  },
  "major-employer-failure": {
    shock: "major-firm-insolvency",
    severity: 5,
    recovery: false,
    additional: [],
  },
  "business-formation-failure": {
    shock: "business-lifecycle",
    severity: 4,
    recovery: false,
    additional: [],
  },
};

function id(config, cluster, namespace, key) {
  return stableId(namespace, {
    scenario_id: config.scenario_id,
    cluster,
    namespace,
    key,
  });
}

function entity(idValue, kind, attributes) {
  return { id: idValue, kind, attributes };
}

function transaction(config, cluster, index, kind, entries, facts = {}) {
  return {
    tick: index,
    priority: cluster,
    module_id: "economy-operations",
    event_type: `economy.${kind}`,
    entity_id: facts.firm_id ?? facts.household_id ?? null,
    causes: [],
    payload: {
      contract_version: "aether-economy-event.v1",
      kind,
      transaction_id: id(config, cluster, "transaction", `${index}-${kind}`),
      entries,
      facts,
      assumptions: {
        synthetic: true,
        authoritative: false,
        mechanism: "deterministic declared counterparty transaction",
      },
    },
  };
}

function leg(entityId, account, amount) {
  return { entity_id: entityId, account, amount };
}

function clusterModel(config, cluster) {
  const citizen = id(config, cluster, "person", "worker-consumer");
  const household = id(config, cluster, "household", "household");
  const producer = id(config, cluster, "organization", "producer");
  const retailer = id(config, cluster, "organization", "retailer-employer");
  const nonprofit = id(config, cluster, "organization", "nonprofit");
  const bank = id(config, cluster, "organization", "bank");
  const government = id(config, cluster, "institution", "government");
  const regulator = id(config, cluster, "institution", "regulator");
  const market = id(config, cluster, "institution", "market");
  const loanId = id(config, cluster, "loan", "working-capital");
  const householdLoanId = id(config, cluster, "loan", "household-credit");
  const taxId = id(config, cluster, "tax", "business-tax");
  const mechanism = scenarioMechanisms[config.scenario_kind];

  const people = [
    entity(citizen, "synthetic-citizen", {
      label: `Fictional citizen ${cluster + 1}`,
      synthetic: true,
    }),
  ];
  const households = [
    entity(household, "synthetic-household", {
      member_ids: [citizen],
      synthetic: true,
    }),
  ];
  const organizations = [
    entity(producer, "firm", { sector: "production", synthetic: true }),
    entity(retailer, "firm", { sector: "services", synthetic: true }),
    entity(nonprofit, "nonprofit", { sector: "community", synthetic: true }),
    entity(bank, "bank", { sector: "financial-intermediation", synthetic: true }),
  ];
  const institutions = [
    entity(government, "government", { jurisdiction: "fictional", synthetic: true }),
    entity(regulator, "regulator", { mandate: "synthetic-market-stability", synthetic: true }),
    entity(market, "market-institution", {
      clearing_rule: "minimum-of-declared-supply-and-demand",
      synthetic: true,
    }),
  ];
  const relationships = [
    entity(id(config, cluster, "relationship", "membership"), "household-membership", {
      from_id: citizen,
      to_id: household,
    }),
    entity(id(config, cluster, "relationship", "employment"), "employment-market", {
      from_id: citizen,
      to_id: retailer,
    }),
    entity(id(config, cluster, "relationship", "supply"), "supplier-customer", {
      from_id: producer,
      to_id: retailer,
    }),
    entity(id(config, cluster, "relationship", "banking"), "credit", {
      from_id: bank,
      to_id: retailer,
    }),
  ];
  const contracts = [
    entity(id(config, cluster, "contract", "employment"), "employment-contract", {
      party_ids: [citizen, retailer],
      status: "active",
    }),
    entity(id(config, cluster, "contract", "supply"), "supply-contract", {
      party_ids: [producer, retailer],
      status: "active",
    }),
    entity(id(config, cluster, "contract", "credit"), "credit-contract", {
      party_ids: [bank, retailer],
      status: "active",
    }),
    entity(id(config, cluster, "contract", "tax"), "generic-tax-contract", {
      party_ids: [retailer, government],
      rate_basis_points: 500,
    }),
  ];
  const agents = [
    { id: citizen, kind: "citizen", cash: 0 },
    { id: household, kind: "household", cash: 300 },
    { id: producer, kind: "firm", cash: 500, inventory: 20, capacity: 20, price: 8, demand: 10 },
    { id: retailer, kind: "firm", cash: 500, inventory: 5, capacity: 15, price: 12, demand: 12 },
    { id: nonprofit, kind: "nonprofit", cash: 100, inventory: 0, capacity: 5, price: 1, demand: 2 },
    { id: bank, kind: "bank", cash: 1000, bank_assets: 1000, bank_liabilities: 800, bank_equity: 200 },
    { id: government, kind: "government", cash: 500 },
    { id: regulator, kind: "regulator", cash: 50 },
    { id: market, kind: "market", cash: 0 },
  ];

  const events = [
    transaction(config, cluster, 1, "business-formation", [
      leg(household, "capital-contribution", -100),
      leg(producer, "paid-in-capital", 100),
    ], { firm_id: producer, household_id: household }),
    transaction(config, cluster, 2, "employment", [], {
      person_id: citizen,
      household_id: household,
      employer_id: retailer,
      employment_action: "hired",
    }),
    transaction(config, cluster, 3, "loan", [], {
      loan_id: loanId,
      borrower_id: retailer,
      firm_id: retailer,
      bank_id: bank,
      principal: 100,
      bank_asset_delta: 100,
      bank_liability_delta: 100,
      bank_equity_delta: 0,
    }),
    transaction(config, cluster, 4, "production", [], {
      firm_id: producer,
      quantity: 10,
      inventory_delta: 10,
    }),
    transaction(config, cluster, 5, "market-clearing", [], {
      market_id: market,
      supply: 10,
      demand: 12,
      matched_quantity: 10,
      price: 8,
    }),
    transaction(config, cluster, 6, "supply-payment", [
      leg(retailer, "inventory-purchase", -40),
      leg(producer, "sales-receipt", 40),
    ], {
      firm_id: producer,
      counterparty_id: retailer,
      revenue: 40,
      inventory_delta: -5,
    }),
    transaction(config, cluster, 7, "wage", [
      leg(retailer, "wage-expense", -50),
      leg(household, "wage-income", 50),
    ], {
      firm_id: retailer,
      household_id: household,
      person_id: citizen,
      income_source: "wages",
      income_amount: 50,
      expenditure: 50,
    }),
    transaction(config, cluster, 8, "consumption", [
      leg(household, "consumption", -30),
      leg(retailer, "sales-receipt", 30),
    ], {
      firm_id: retailer,
      household_id: household,
      quantity: 3,
      revenue: 30,
      inventory_delta: -3,
    }),
    transaction(config, cluster, 9, "tax", [
      leg(retailer, "tax-expense", -10),
      leg(government, "tax-receipt", 10),
    ], {
      firm_id: retailer,
      taxpayer_id: retailer,
      government_id: government,
      tax_id: taxId,
      tax_amount: 10,
      expenditure: 10,
    }),
    transaction(config, cluster, 10, "public-transfer", [
      leg(government, "transfer-expenditure", -5),
      leg(household, "transfer-income", 5),
    ], {
      household_id: household,
      government_id: government,
      income_source: "transfers",
      income_amount: 5,
      public_expenditure: 5,
    }),
    transaction(config, cluster, 11, "interest", [
      leg(retailer, "interest-expense", -2),
      leg(bank, "interest-income", 2),
    ], { firm_id: retailer, bank_id: bank, expenditure: 2 }),
    transaction(config, cluster, 12, "loan-repayment", [
      leg(retailer, "principal-repayment", -10),
      leg(bank, "loan-collection", 10),
    ], {
      firm_id: retailer,
      bank_id: bank,
      loan_id: loanId,
      principal_repaid: 10,
      bank_asset_delta: -10,
      bank_liability_delta: -10,
      bank_equity_delta: 0,
    }),
    transaction(config, cluster, 13, "saving", [
      leg(household, "saving", -10),
      leg(bank, "deposit-funding", 10),
    ], { household_id: household, bank_id: bank }),
    transaction(config, cluster, 14, "public-procurement", [
      leg(government, "procurement-expenditure", -8),
      leg(nonprofit, "service-revenue", 8),
    ], {
      firm_id: nonprofit,
      government_id: government,
      public_expenditure: 8,
      revenue: 8,
    }),
    transaction(config, cluster, 15, "investment", [
      leg(retailer, "capital-expenditure", -15),
      leg(producer, "capital-goods-revenue", 15),
    ], { firm_id: retailer, expenditure: 15, capacity_delta: 2 }),
    transaction(config, cluster, 16, "shock", [], {
      firm_id: retailer,
      shock_kind: mechanism.shock,
      severity: mechanism.severity,
      demand_delta: mechanism.shock === "demand-contraction" ? -3 : 0,
      capacity_delta: mechanism.shock === "supply-disruption" ? -3 : 0,
      price_delta: mechanism.shock === "supply-disruption" ? 2 : 0,
    }),
    transaction(config, cluster, 23, "borrowing", [], {
      loan_id: householdLoanId,
      borrower_id: household,
      household_id: household,
      bank_id: bank,
      principal: 20,
      bank_asset_delta: 20,
      bank_liability_delta: 20,
      bank_equity_delta: 0,
    }),
  ];

  if (config.scenario_kind === "policy-intervention-baseline") {
    events.push(transaction(config, cluster, 17, "policy-change", [], {
      government_id: government,
      policy_kind: "temporary-transfer-and-tax-adjustment",
    }));
  }
  if (mechanism.recovery && mechanism.shock !== "none") {
    events.push(transaction(config, cluster, 18, "restructuring", [], {
      firm_id: retailer,
      status: "active",
      demand_delta: 3,
      capacity_delta: mechanism.shock === "supply-disruption" ? 3 : 0,
    }));
  }
  if (["credit-tightening-default", "major-employer-failure", "business-formation-failure"].includes(config.scenario_kind)) {
    events.push(
      transaction(config, cluster, 19, "default", [], {
        firm_id: retailer,
        bank_id: bank,
        loan_id: loanId,
        default_amount: 20,
        bank_asset_delta: -20,
        bank_liability_delta: 0,
        bank_equity_delta: -20,
      }),
      transaction(config, cluster, 20, "insolvency", [], {
        firm_id: retailer,
        status: "insolvent",
      }),
      transaction(config, cluster, 21, "employment", [], {
        person_id: citizen,
        household_id: household,
        employer_id: retailer,
        employment_action: "separated",
      }),
      transaction(config, cluster, 22, "closure", [], {
        firm_id: retailer,
        status: "closed",
      }),
      transaction(config, cluster, 27, "default", [], {
        household_id: household,
        bank_id: bank,
        loan_id: householdLoanId,
        default_amount: 5,
        bank_asset_delta: -5,
        bank_liability_delta: 0,
        bank_equity_delta: -5,
      }),
    );
  }
  for (const [offset, shockKind] of mechanism.additional.entries()) {
    events.push(transaction(config, cluster, 24 + offset, "shock", [], {
      firm_id: retailer,
      shock_kind: shockKind,
      severity: 2,
      price_delta: shockKind === "energy-input-price-increase" ? 1 : 0,
      capacity_delta: shockKind === "labour-shortage" ? -1 : 0,
    }));
  }

  return {
    people,
    households,
    organizations,
    institutions,
    relationships,
    contracts,
    agents,
    citizen_ids: [citizen],
    events,
  };
}

function batches(count, partitionSize) {
  const result = [];
  for (let start = 0; start < count; start += partitionSize) {
    result.push(Array.from(
      { length: Math.min(partitionSize, count - start) },
      (_, offset) => start + offset,
    ));
  }
  return result;
}

export function buildEconomyScenario(value, options = {}) {
  const config = assertEconomyConfig(structuredClone(value));
  const partitionSize = options.partitionSize ?? config.partition_size ?? config.scale;
  if (!Number.isSafeInteger(partitionSize) || partitionSize < 1) {
    throw new TypeError("partition size must be a positive safe integer");
  }
  const clusters = [];
  for (const partition of batches(config.scale, partitionSize)) {
    for (const cluster of partition) clusters.push(clusterModel(config, cluster));
  }
  const merge = (name) =>
    clusters.flatMap((cluster) => cluster[name]).sort((left, right) =>
      left.id.localeCompare(right.id));
  const agents = merge("agents");
  const citizenIds = clusters.flatMap((cluster) => cluster.citizen_ids).sort();
  const events = clusters.flatMap((cluster) => cluster.events).sort((left, right) =>
    left.tick - right.tick ||
    left.priority - right.priority ||
    left.payload.transaction_id.localeCompare(right.payload.transaction_id));

  return {
    contract_version: "aether-scenario.v1",
    scenario_id: config.scenario_id,
    title: `Synthetic economy: ${config.scenario_kind}`,
    description: "Entity-level deterministic research economy with explicit assumptions.",
    seed: config.seed,
    clock: {
      start_tick: 0,
      end_tick: Math.max(config.periods * 20, 60),
      tick_duration_ms: 86400000,
    },
    provenance: {
      origin: "scenario-specification",
      tier: "synthetic",
      authoritative: false,
      external_credentials_used: false,
    },
    research_status: "research-preview",
    limitations: [
      "Aggregate indicators derive only from synthetic entity-level events.",
      "Market, policy, and behavioral mechanisms are simplified declared assumptions.",
      "Outputs are not forecasts, investment guidance, or policy authority.",
    ],
    modules: [
      { module_id: "core", config: {} },
      {
        module_id: "economy-operations",
        config: { agents, citizen_ids: citizenIds },
      },
    ],
    initial_state: {
      people: merge("people"),
      households: merge("households"),
      organizations: merge("organizations"),
      institutions: merge("institutions"),
      systems: [],
      assets: [],
      relationships: merge("relationships"),
      contracts: merge("contracts"),
      accounts: agents.map((agent) =>
        entity(id(config, agent.id, "account", "cash"), "cash-account", {
          owner_id: agent.id,
        })),
      resources: [],
      balances: agents.map((agent) => ({
        id: id(config, agent.id, "balance", "cash"),
        account_id: id(config, agent.id, "account", "cash"),
        resource: "synthetic-currency-unit",
        amount: agent.cash,
      })),
      metrics: [],
      observations: [],
    },
    scheduled_events: events,
  };
}

export function economyPartitionPlan(config, partitionSize) {
  assertEconomyConfig(config);
  return batches(config.scale, partitionSize).map((clusterIds, index) => ({
    partition: index,
    cluster_ids: clusterIds,
  }));
}

export function buildEconomyIntervention(config, { tick = 17, transfer = 12 } = {}) {
  const scenario = buildEconomyScenario(config);
  const economyConfig = scenario.modules.find(
    ({ module_id: moduleId }) => moduleId === "economy-operations",
  ).config;
  const household = economyConfig.agents.find((agent) => agent.kind === "household");
  const government = economyConfig.agents.find((agent) => agent.kind === "government");
  return [{
    tick,
    module_id: "economy-operations",
    event_type: "economy.policy-change",
    entity_id: household.id,
    causes: [],
    payload: {
      contract_version: "aether-economy-event.v1",
      kind: "policy-change",
      transaction_id: stableId("transaction", {
        scenario_id: config.scenario_id,
        intervention: "household-transfer",
        transfer,
      }),
      entries: [
        leg(government.id, "intervention-expenditure", -transfer),
        leg(household.id, "intervention-receipt", transfer),
      ],
      facts: {
        government_id: government.id,
        household_id: household.id,
        income_source: "transfers",
        income_amount: transfer,
        public_expenditure: transfer,
        policy_kind: "household-transfer",
      },
      assumptions: {
        synthetic: true,
        authoritative: false,
        mechanism: "declared deterministic intervention",
      },
    },
  }];
}

export { scenarioMechanisms as economyScenarioMetadata };
