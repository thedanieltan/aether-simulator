import { stableId } from "../kernel/ids.mjs";
import { getEnterpriseArchetype } from "./archetypes.mjs";
import { assertEnterpriseConfig } from "./validation.mjs";

function idFor(config, namespace, key) {
  return stableId(namespace, {
    scenario_id: config.scenario_id,
    namespace,
    key,
  });
}

function sequenceTransitions(states) {
  return states.map((state, index) => ({
    from: index === 0 ? null : states[index - 1],
    to: state,
  }));
}

function buildInitialState(config, archetype) {
  const organizationId = idFor(config, "organization", "enterprise");
  const customerId = idFor(config, "organization", "customer-context");
  const supplierId = idFor(config, "organization", "supplier-context");
  const people = Array.from({ length: config.scale }, (_, index) => ({
    id: idFor(config, "person", `worker-${index + 1}`),
    kind: index === 0 ? "synthetic-primary-worker" : "synthetic-worker",
    attributes: {
      display_name: `Synthetic Worker ${String(index + 1).padStart(3, "0")}`,
      fictional: true,
      department: archetype.departments[index % archetype.departments.length],
      role: archetype.roles[index % archetype.roles.length],
    },
  }));
  const systems = archetype.systems.map((system, index) => ({
    id: idFor(config, "system", system),
    kind: `synthetic-${system}`,
    attributes: {
      display_name: `Synthetic ${system}`,
      surface: system,
      external: false,
      sequence: index,
    },
  }));
  const systemIds = Object.fromEntries(
    archetype.systems.map((system, index) => [system, systems[index].id]),
  );
  const assets = archetype.assets.map((asset, index) => ({
    id: idFor(config, "asset", asset),
    kind: `synthetic-${asset}`,
    attributes: {
      owner_id: organizationId,
      assigned_to: people[index % people.length].id,
      operational: true,
    },
  }));
  const employment = people.map((person, index) => {
    const relationshipId = idFor(config, "relationship", `employment-${index + 1}`);
    return {
      relationship_id: relationshipId,
      person_id: person.id,
      status:
        config.journey === "employee-lifecycle" && index === 0
          ? "applicant"
          : "active",
      history: [],
    };
  });
  const relationships = [
    ...employment.map((entry) => ({
      id: entry.relationship_id,
      kind: "employment",
      attributes: {
        from_entity_id: entry.person_id,
        to_entity_id: organizationId,
        status: entry.status,
      },
    })),
    ...people.slice(1).map((person, index) => ({
      id: idFor(config, "relationship", `reporting-${index + 1}`),
      kind: "reporting-line",
      attributes: {
        from_entity_id: person.id,
        to_entity_id: people[0].id,
        active: true,
      },
    })),
    {
      id: idFor(config, "relationship", "customer"),
      kind: "customer-context",
      attributes: {
        from_entity_id: customerId,
        to_entity_id: organizationId,
        simulated_counterparty: false,
      },
    },
    {
      id: idFor(config, "relationship", "supplier"),
      kind: "supplier-context",
      attributes: {
        from_entity_id: supplierId,
        to_entity_id: organizationId,
        simulated_counterparty: false,
      },
    },
  ];

  const accountKinds = [
    "cash",
    "revenue",
    "expense",
    "receivable",
    "payable",
    "payroll",
    "inventory",
  ];
  const accounts = accountKinds.map((kind) => ({
    id: idFor(config, "account", kind),
    kind: `${kind}-account`,
    attributes: { owner_id: organizationId, normal_balance: kind },
  }));
  const accountIds = Object.fromEntries(
    accountKinds.map((kind, index) => [kind, accounts[index].id]),
  );
  const balances = accountKinds.map((kind, index) => ({
    id: idFor(config, "balance", kind),
    account_id: accounts[index].id,
    resource: "synthetic-credit",
    amount: kind === "cash" ? 10000 : 0,
  }));
  const balanceIds = Object.fromEntries(
    accountKinds.map((kind, index) => [kind, balances[index].id]),
  );
  const inventoryResourceId = idFor(config, "resource", "inventory");
  const capacityResourceId = idFor(config, "resource", "capacity");
  const resources = [
    {
      id: inventoryResourceId,
      kind: archetype.resource_kind,
      attributes: {
        owner_id: organizationId,
        quantity: archetype.initial_inventory * config.scale,
        unit_cost: archetype.unit_cost,
      },
    },
    {
      id: capacityResourceId,
      kind: "operational-capacity",
      attributes: {
        owner_id: organizationId,
        total: archetype.initial_capacity * config.scale,
        available: archetype.initial_capacity * config.scale,
      },
    },
    ...archetype.offerings.map((offering) => ({
      id: idFor(config, "resource", offering),
      kind: "offering",
      attributes: {
        owner_id: organizationId,
        offering_kind: offering,
        unit_price: archetype.unit_price,
      },
    })),
  ];
  const contracts = [
    {
      id: idFor(config, "contract", "employment"),
      kind: "synthetic-employment-policy",
      attributes: {
        party_ids: [organizationId, people[0].id],
        active: true,
        payroll_requires_active_employment: true,
      },
    },
    {
      id: idFor(config, "contract", "customer"),
      kind: "synthetic-customer-contract",
      attributes: {
        party_ids: [organizationId, customerId],
        active: true,
        terms: "fictional-research-terms",
      },
    },
    {
      id: idFor(config, "contract", "supplier"),
      kind: "synthetic-supplier-contract",
      attributes: {
        party_ids: [organizationId, supplierId],
        active: true,
        terms: "fictional-research-terms",
      },
    },
    ...archetype.constraints.map((constraint) => ({
      id: idFor(config, "contract", `policy-${constraint}`),
      kind: "synthetic-policy",
      attributes: {
        party_ids: [organizationId],
        active: true,
        rule: constraint,
      },
    })),
  ];

  return {
    ids: {
      organizationId,
      customerId,
      supplierId,
      primaryPersonId: people[0].id,
      primarySubjectId: idFor(config, "subject", "primary-person"),
      primaryEmploymentId: employment[0].relationship_id,
      accountIds,
      balanceIds,
      inventoryResourceId,
      capacityResourceId,
      systemIds,
    },
    employment,
    initial_state: {
      people,
      households: [
        {
          id: idFor(config, "household", "primary"),
          kind: "synthetic-household",
          attributes: { member_ids: [people[0].id] },
        },
      ],
      organizations: [
        {
          id: organizationId,
          kind: `synthetic-${config.archetype}-enterprise`,
          attributes: {
            display_name: `Synthetic ${config.archetype} enterprise`,
            fictional: true,
            archetype: config.archetype,
            departments: structuredClone(archetype.departments),
            roles: structuredClone(archetype.roles),
            offerings: structuredClone(archetype.offerings),
          },
        },
        {
          id: customerId,
          kind: "synthetic-counterparty-context",
          attributes: { fictional: true, simulated: false, role: "customer" },
        },
        {
          id: supplierId,
          kind: "synthetic-counterparty-context",
          attributes: { fictional: true, simulated: false, role: "supplier" },
        },
      ],
      institutions: [],
      systems,
      assets,
      relationships,
      contracts,
      accounts,
      resources,
      balances,
      metrics: [],
      observations: [
        {
          id: idFor(config, "observation", "research-boundary"),
          kind: "research-boundary",
          attributes: {
            value: "synthetic, experimental, and non-authoritative",
            ecosystem_counterparties_simulated: false,
          },
        },
      ],
    },
  };
}

function buildJourney(config, archetype, model) {
  const { ids } = model;
  const workflowId = idFor(config, "workflow", config.journey);
  const invoiceId = idFor(config, "invoice", config.journey);
  const paymentId = idFor(config, "payment", config.journey);
  const recordId = idFor(config, "record", config.journey);
  const incidentId = idFor(config, "incident", config.journey);
  const journal = (purpose) => idFor(config, "journal", `${config.journey}-${purpose}`);
  const units = archetype.transaction_units * config.scale;
  const amount = archetype.unit_price * units;
  const scheduledEvents = [];
  let tick = 1;
  let previousStepId = null;

  function add(eventType, action, payload = {}, consequences = {}) {
    const stepId = idFor(
      config,
      "step",
      `${String(scheduledEvents.length + 1).padStart(3, "0")}-${action}`,
    );
    scheduledEvents.push({
      tick,
      module_id: "enterprise-operations",
      event_type: eventType,
      entity_id: ids.organizationId,
      payload: {
        ...payload,
        causal: {
          step_id: stepId,
          previous_step_id: previousStepId,
          actor_id: ids.primaryPersonId,
          action,
          workflow_id: workflowId,
          system_id:
            consequences.system_id ??
            Object.values(ids.systemIds)[
              scheduledEvents.length % Object.values(ids.systemIds).length
            ],
          resource_consequence: consequences.resource_consequence ?? null,
          financial_consequence: consequences.financial_consequence ?? null,
          data_consequence: consequences.data_consequence ?? null,
        },
      },
    });
    previousStepId = stepId;
    tick += 3;
    return stepId;
  }

  function transition(from, to, action = `transition-${to}`) {
    add("enterprise.workflow.transitioned", action, {
      workflow_id: workflowId,
      from,
      to,
    });
  }

  function data(operation, overrides = {}) {
    add(
      "enterprise.data.changed",
      `data-${operation}`,
      {
        record_id: recordId,
        operation,
        subject_ref: ids.primarySubjectId,
        system_id: Object.values(ids.systemIds)[0],
        role_context: "synthetic-worker-and-customer-context",
        system_surface: Object.keys(ids.systemIds)[0],
        fields: [
          { field_path: "synthetic_identifier", data_category: "identifier" },
          { field_path: "synthetic_role", data_category: "role-context" },
        ],
        access_role_ids: ["synthetic-operations-role"],
        copied_from: overrides.copied_from ?? null,
        transformed_by: overrides.transformed_by ?? null,
      },
      {
        data_consequence: { record_id: recordId, operation },
      },
    );
  }

  function capacity(delta, action) {
    add(
      "enterprise.capacity.changed",
      action,
      { resource_id: ids.capacityResourceId, delta },
      {
        resource_consequence: {
          resource_id: ids.capacityResourceId,
          delta,
        },
      },
    );
  }

  function inventory(delta, action) {
    add(
      "enterprise.inventory.changed",
      action,
      { resource_id: ids.inventoryResourceId, delta },
      {
        resource_consequence: {
          resource_id: ids.inventoryResourceId,
          delta,
        },
      },
    );
  }

  function invoice() {
    add(
      "enterprise.invoice.issued",
      "issue-invoice",
      { invoice_id: invoiceId, amount },
      { financial_consequence: { invoice_id: invoiceId, amount } },
    );
    add(
      "enterprise.ledger.posted",
      "post-invoice",
      {
        journal_id: journal("invoice"),
        purpose: "customer-invoice",
        entries: [
          { account_id: ids.accountIds.receivable, debit: amount, credit: 0 },
          { account_id: ids.accountIds.revenue, debit: 0, credit: amount },
        ],
        postings: [
          { balance_id: ids.balanceIds.receivable, delta: amount },
          { balance_id: ids.balanceIds.revenue, delta: amount },
        ],
      },
      { financial_consequence: { journal_id: journal("invoice"), amount } },
    );
  }

  function payment() {
    add(
      "enterprise.payment.applied",
      "apply-payment",
      { payment_id: paymentId, invoice_id: invoiceId, amount },
      {
        financial_consequence: {
          payment_id: paymentId,
          invoice_id: invoiceId,
          amount,
        },
      },
    );
    add(
      "enterprise.ledger.posted",
      "post-payment",
      {
        journal_id: journal("payment"),
        purpose: "customer-payment",
        entries: [
          { account_id: ids.accountIds.cash, debit: amount, credit: 0 },
          { account_id: ids.accountIds.receivable, debit: 0, credit: amount },
        ],
        postings: [
          { balance_id: ids.balanceIds.cash, delta: amount },
          { balance_id: ids.balanceIds.receivable, delta: -amount },
        ],
      },
      { financial_consequence: { journal_id: journal("payment"), amount } },
    );
  }

  function outcome(kind, value, unit) {
    add(
      "enterprise.outcome.recorded",
      `record-${kind}`,
      { kind, value, unit },
      { resource_consequence: { kind, value, unit } },
    );
  }

  let states;
  if (config.journey === "customer-engagement") {
    states = ["lead", "qualified", "proposed", "contracted", "delivering", "invoiced", "paid"];
    transition(null, "lead");
    data("created");
    data("accessed");
    transition("lead", "qualified");
    transition("qualified", "proposed");
    transition("proposed", "contracted");
    capacity(-units, "allocate-delivery-work");
    transition("contracted", "delivering");
    outcome("delivered-work", units, "consulting-hour");
    data("used");
    capacity(units, "release-delivery-capacity");
    transition("delivering", "invoiced");
    invoice();
    data("copied", { copied_from: recordId });
    transition("invoiced", "paid");
    payment();
  } else if (config.journey === "saas-lifecycle") {
    const finalState = config.options.outcome === "churn" ? "churned" : "renewed";
    states = ["signup", "active", "supported", finalState];
    transition(null, "signup");
    data("created");
    data("accessed");
    capacity(-units, "allocate-service-capacity");
    transition("signup", "active");
    invoice();
    payment();
    transition("active", "supported");
    data("used");
    outcome("support-resolution", 1, "case");
    transition("supported", finalState);
    capacity(units, "release-service-capacity");
    if (finalState === "churned") data("expired");
    else data("transformed", { transformed_by: "renewal-workflow" });
  } else if (
    config.journey === "order-to-cash" ||
    config.journey === "intervention-baseline"
  ) {
    const finalState = config.options.outcome === "refund" ? "refunded" : "paid";
    states = ["received", "confirmed", "allocated", "fulfilled", "invoiced", "paid"];
    if (finalState === "refunded") states.push("refunded");
    transition(null, "received");
    data("created");
    transition("received", "confirmed");
    if (config.archetype === "manufacturing") {
      capacity(-units, "allocate-production-capacity");
      outcome("production", units, archetype.resource_kind);
      inventory(units, "produce-finished-inventory");
      capacity(units, "release-production-capacity");
      outcome(
        "utilisation",
        units / (archetype.initial_capacity * config.scale),
        "ratio",
      );
      outcome("backlog", 0, "order");
    }
    inventory(-units, "allocate-inventory");
    transition("confirmed", "allocated");
    capacity(-1, "allocate-fulfilment-capacity");
    transition("allocated", "fulfilled");
    capacity(1, "release-fulfilment-capacity");
    transition("fulfilled", "invoiced");
    invoice();
    transition("invoiced", "paid");
    payment();
    if (finalState === "refunded") {
      transition("paid", "refunded");
      inventory(units, "return-inventory");
      add(
        "enterprise.ledger.posted",
        "post-refund",
        {
          journal_id: journal("refund"),
          purpose: "customer-refund",
          entries: [
            { account_id: ids.accountIds.revenue, debit: amount, credit: 0 },
            { account_id: ids.accountIds.cash, debit: 0, credit: amount },
          ],
          postings: [
            { balance_id: ids.balanceIds.revenue, delta: -amount },
            { balance_id: ids.balanceIds.cash, delta: -amount },
          ],
        },
        { financial_consequence: { journal_id: journal("refund"), amount } },
      );
    }
    outcome("service-level", archetype.service_level_target, "ratio");
  } else if (config.journey === "delivery-exception") {
    states = ["accepted", "allocated", "in-transit", "failed", "remediated", "delivered", "invoiced", "paid"];
    transition(null, "accepted");
    data("created");
    capacity(-units, "allocate-delivery-slots");
    transition("accepted", "allocated");
    transition("allocated", "in-transit");
    transition("in-transit", "failed");
    add("enterprise.incident.changed", "detect-failed-delivery", {
      incident_id: incidentId,
      kind: "failed-delivery",
      status: "detected",
    });
    transition("failed", "remediated");
    add("enterprise.incident.changed", "remediate-failed-delivery", {
      incident_id: incidentId,
      kind: "failed-delivery",
      status: "remediated",
    });
    transition("remediated", "delivered");
    capacity(units, "release-delivery-slots");
    transition("delivered", "invoiced");
    invoice();
    transition("invoiced", "paid");
    payment();
    outcome("failed-deliveries", 1, "delivery");
  } else if (config.journey === "employee-lifecycle") {
    states = ["applicant", "recruited", "onboarded", "active", "transferred", "promoted", "departed"];
    transition(null, "applicant");
    data("created");
    add("enterprise.employment.changed", "recruit-worker", {
      relationship_id: ids.primaryEmploymentId,
      person_id: ids.primaryPersonId,
      status: "active",
    });
    transition("applicant", "recruited");
    transition("recruited", "onboarded");
    data("copied", { copied_from: recordId });
    transition("onboarded", "active");
    add("enterprise.outcome.recorded", "record-attendance", {
      kind: "attendance",
      value: 1,
      unit: "workday",
    });
    add("enterprise.outcome.recorded", "allocate-work", {
      kind: "allocated-work",
      value: 8,
      unit: "hour",
    });
    add(
      "enterprise.ledger.posted",
      "pay-payroll",
      {
        journal_id: journal("payroll"),
        purpose: "payroll",
        employment_relationship_id: ids.primaryEmploymentId,
        entries: [
          { account_id: ids.accountIds.payroll, debit: amount, credit: 0 },
          { account_id: ids.accountIds.cash, debit: 0, credit: amount },
        ],
        postings: [
          { balance_id: ids.balanceIds.payroll, delta: amount },
          { balance_id: ids.balanceIds.cash, delta: -amount },
        ],
      },
      { financial_consequence: { journal_id: journal("payroll"), amount } },
    );
    transition("active", "transferred");
    data("transformed", { transformed_by: "transfer-workflow" });
    transition("transferred", "promoted");
    add("enterprise.employment.changed", "depart-worker", {
      relationship_id: ids.primaryEmploymentId,
      person_id: ids.primaryPersonId,
      status: "departed",
    });
    transition("promoted", "departed");
    data("deleted");
  } else if (config.journey === "procurement-to-payment") {
    states = ["supplier-onboarded", "ordered", "received", "invoice-matched", "paid"];
    transition(null, "supplier-onboarded");
    data("created");
    transition("supplier-onboarded", "ordered");
    transition("ordered", "received");
    inventory(units, "receive-inventory");
    add(
      "enterprise.invoice.issued",
      "record-supplier-invoice",
      { invoice_id: invoiceId, amount },
      { financial_consequence: { invoice_id: invoiceId, amount } },
    );
    add(
      "enterprise.ledger.posted",
      "post-supplier-invoice",
      {
        journal_id: journal("supplier-invoice"),
        purpose: "supplier-invoice",
        entries: [
          { account_id: ids.accountIds.inventory, debit: amount, credit: 0 },
          { account_id: ids.accountIds.payable, debit: 0, credit: amount },
        ],
        postings: [
          { balance_id: ids.balanceIds.inventory, delta: amount },
          { balance_id: ids.balanceIds.payable, delta: amount },
        ],
      },
      { financial_consequence: { journal_id: journal("supplier-invoice"), amount } },
    );
    transition("received", "invoice-matched");
    add(
      "enterprise.payment.applied",
      "pay-supplier",
      { payment_id: paymentId, invoice_id: invoiceId, amount },
      { financial_consequence: { payment_id: paymentId, amount } },
    );
    add(
      "enterprise.ledger.posted",
      "post-supplier-payment",
      {
        journal_id: journal("supplier-payment"),
        purpose: "supplier-payment",
        entries: [
          { account_id: ids.accountIds.payable, debit: amount, credit: 0 },
          { account_id: ids.accountIds.cash, debit: 0, credit: amount },
        ],
        postings: [
          { balance_id: ids.balanceIds.payable, delta: -amount },
          { balance_id: ids.balanceIds.cash, delta: -amount },
        ],
      },
      { financial_consequence: { journal_id: journal("supplier-payment"), amount } },
    );
    transition("invoice-matched", "paid");
  } else if (config.journey === "outage-remediation") {
    states = ["operating", "misconfigured", "outage", "detected", "remediated", "restored"];
    transition(null, "operating");
    data("created");
    transition("operating", "misconfigured");
    data("transformed", { transformed_by: "incorrect-configuration" });
    transition("misconfigured", "outage");
    add("enterprise.incident.changed", "detect-outage", {
      incident_id: incidentId,
      kind: config.options.failure_mode ?? "outage",
      status: "detected",
    });
    transition("outage", "detected");
    add("enterprise.incident.changed", "remediate-outage", {
      incident_id: incidentId,
      kind: config.options.failure_mode ?? "outage",
      status: "remediated",
    });
    transition("detected", "remediated");
    data("transformed", { transformed_by: "remediation-workflow" });
    transition("remediated", "restored");
    outcome("downtime", 3, "tick");
  } else {
    throw new TypeError(`unsupported enterprise journey: ${config.journey}`);
  }

  return {
    workflowId,
    terminalStepId: previousStepId,
    stateMachine: {
      workflow_id: workflowId,
      states,
      transitions: sequenceTransitions(states),
    },
    scheduledEvents,
    endTick: tick + 1,
  };
}

export function buildEnterpriseScenario(config) {
  assertEnterpriseConfig(config);
  const archetype = getEnterpriseArchetype(config.archetype);
  const model = buildInitialState(config, archetype);
  const journey = buildJourney(config, archetype, model);

  return {
    contract_version: "aether-scenario.v1",
    scenario_id: config.scenario_id,
    title: config.title,
    description:
      config.description ??
      `Synthetic ${config.archetype} ${config.journey} research scenario.`,
    seed: config.seed,
    clock: {
      start_tick: 0,
      end_tick: journey.endTick,
      tick_duration_ms: 900000,
    },
    provenance: {
      origin: "scenario-specification",
      tier: "synthetic",
      authoritative: false,
      external_credentials_used: false,
    },
    research_status: "research-preview",
    limitations: [
      ...config.limitations,
      "External counterparties are boundary contexts, not independent simulated enterprises.",
      "Synthetic outcomes do not establish legal, regulatory, audit, or compliance conclusions.",
    ],
    modules: [
      {
        module_id: "enterprise-operations",
        config: {
          archetype: config.archetype,
          constraints: structuredClone(archetype.constraints),
          allow_backorders: config.options.allow_backorders,
          state_machines: {
            [journey.workflowId]: structuredClone(journey.stateMachine),
          },
          inventory: {
            resource_id: model.ids.inventoryResourceId,
            initial_quantity: archetype.initial_inventory * config.scale,
          },
          capacity: {
            resource_id: model.ids.capacityResourceId,
            initial_available: archetype.initial_capacity * config.scale,
            total: archetype.initial_capacity * config.scale,
          },
          employment: structuredClone(model.employment),
          terminal_step_id: journey.terminalStepId,
        },
      },
    ],
    initial_state: model.initial_state,
    scheduled_events: journey.scheduledEvents,
  };
}
