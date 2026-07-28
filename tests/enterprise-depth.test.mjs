import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { normalizeWorldEvidence } from "../packages/evidence-bridge/src/index.mjs";
import {
  buildEnterpriseScenario,
  canonicalJson,
  compareEnterpriseRuns,
  compareRuns,
  enterpriseOperationsModule,
  enterpriseState,
  getEnterpriseArchetype,
  listEnterpriseArchetypes,
  SimulationKernel,
  stableId,
  traceEnterpriseCausality,
  validateEnterpriseConfig,
  validateEnterpriseInvariants,
} from "../src/index.mjs";

const scenarioDirectory = new URL("../scenarios/enterprise/", import.meta.url);
const scenarioNames = (await readdir(scenarioDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const configs = new Map(
  await Promise.all(
    scenarioNames.map(async (name) => [
      name,
      JSON.parse(await readFile(new URL(name, scenarioDirectory), "utf8")),
    ]),
  ),
);

function kernel() {
  return new SimulationKernel({ modules: [enterpriseOperationsModule] });
}

function config(name) {
  return structuredClone(configs.get(name));
}

function run(name) {
  const scenario = buildEnterpriseScenario(config(name));
  return { scenario, exported: kernel().run(scenario) };
}

test("all enterprise configs validate and run with invariant-safe projections", () => {
  assert.equal(configs.size, 9);
  for (const [name, value] of configs) {
    assert.equal(validateEnterpriseConfig(value).valid, true, name);
    const scenario = buildEnterpriseScenario(structuredClone(value));
    const first = kernel().run(scenario);
    const second = kernel().run(structuredClone(scenario));
    assert.equal(canonicalJson(first), canonicalJson(second), name);
    const invariants = validateEnterpriseInvariants(first);
    assert.equal(invariants.valid, true, `${name}: ${invariants.errors.join("; ")}`);
    assert.ok(invariants.counts.causal_steps > 0, name);
  }
});

test("five archetypes materially alter structure, resources, workflows, and economics", () => {
  const archetypes = listEnterpriseArchetypes();
  assert.equal(archetypes.length, 5);
  const signatures = new Set(
    archetypes.map((archetype) =>
      canonicalJson({
        departments: archetype.departments,
        roles: archetype.roles,
        systems: archetype.systems,
        assets: archetype.assets,
        offerings: archetype.offerings,
        workflows: archetype.workflows,
        constraints: archetype.constraints,
        resource_kind: archetype.resource_kind,
        initial_inventory: archetype.initial_inventory,
        initial_capacity: archetype.initial_capacity,
        unit_price: archetype.unit_price,
        unit_cost: archetype.unit_cost,
        transaction_units: archetype.transaction_units,
        service_level_target: archetype.service_level_target,
      }),
    ),
  );
  assert.equal(signatures.size, 5);
});

test("enterprise configuration rejects incompatible archetype journeys and outcomes", () => {
  const invalidJourney = config("retail-order-to-cash.json");
  invalidJourney.archetype = "professional-services";
  assert.equal(validateEnterpriseConfig(invalidJourney).valid, false);
  assert.throws(
    () => buildEnterpriseScenario(invalidJourney),
    /journey.*not supported/,
  );

  const invalidOutcome = config("saas-customer-lifecycle.json");
  invalidOutcome.options.outcome = "refund";
  assert.equal(validateEnterpriseConfig(invalidOutcome).valid, false);
  assert.throws(
    () => buildEnterpriseScenario(invalidOutcome),
    /outcome.*not supported/,
  );
});

test("professional services, SaaS, and retail complete different end-to-end journeys", () => {
  const cases = [
    ["professional-services-customer-engagement.json", "paid"],
    ["saas-customer-lifecycle.json", "renewed"],
    ["retail-order-to-cash.json", "paid"],
  ];
  const signatures = new Set();
  for (const [name, finalState] of cases) {
    const { exported } = run(name);
    const state = enterpriseState(exported);
    assert.ok(Object.values(state.workflows).includes(finalState), name);
    assert.ok(state.ledger.length >= 2, name);
    assert.ok(Object.keys(state.invoices).length >= 1, name);
    signatures.add(
      canonicalJson({
        archetype: state.archetype,
        workflow: state.workflows,
        inventory: state.inventory,
        capacity: state.capacity,
        outcomes: state.operational_outcomes,
      }),
    );
  }
  assert.equal(signatures.size, 3);
});

test("accounting entries balance and invoices reconcile to payments", () => {
  for (const name of [
    "professional-services-customer-engagement.json",
    "retail-order-to-cash.json",
    "manufacturing-procurement-to-payment.json",
  ]) {
    const state = enterpriseState(run(name).exported);
    for (const journal of state.ledger) {
      const debit = journal.entries.reduce((total, entry) => total + entry.debit, 0);
      const credit = journal.entries.reduce((total, entry) => total + entry.credit, 0);
      assert.equal(debit, credit, journal.journal_id);
    }
    for (const invoice of Object.values(state.invoices)) {
      assert.equal(invoice.status, "paid", name);
      assert.equal(invoice.paid, invoice.amount, name);
    }
  }
});

test("inventory and capacity invariants fail closed", () => {
  const configValue = config("retail-intervention-baseline.json");
  const scenario = buildEnterpriseScenario(configValue);
  const checkpoint = kernel().checkpoint(scenario, 10);
  const firstStep = scenario.scheduled_events.find((event) => event.tick === 10)
    .payload.causal.step_id;
  const invalid = [
    {
      tick: 11,
      module_id: "enterprise-operations",
      event_type: "enterprise.inventory.changed",
      entity_id: scenario.initial_state.organizations[0].id,
      payload: {
        resource_id: scenario.modules[0].config.inventory.resource_id,
        delta: -1000,
        causal: {
          step_id: stableId("step", "invalid-negative-inventory"),
          previous_step_id: firstStep,
          actor_id: scenario.initial_state.people[0].id,
          action: "invalid-negative-inventory",
          workflow_id: Object.keys(scenario.modules[0].config.state_machines)[0],
          system_id: scenario.initial_state.systems[0].id,
          resource_consequence: { delta: -1000 },
          financial_consequence: null,
          data_consequence: null,
        },
      },
    },
  ];
  assert.throws(
    () => kernel().branch(scenario, checkpoint, invalid),
    /inventory cannot become negative/,
  );

  const logistics = buildEnterpriseScenario(
    config("logistics-delivery-exception.json"),
  );
  const capacityEvent = logistics.scheduled_events.find(
    (event) => event.event_type === "enterprise.capacity.changed",
  );
  capacityEvent.payload.delta = -100000;
  capacityEvent.payload.causal.resource_consequence.delta = -100000;
  assert.throws(() => kernel().run(logistics), /capacity change violates/);
});

test("payroll requires active employment and workflow transitions are declared", () => {
  const payrollScenario = buildEnterpriseScenario(
    config("manufacturing-employee-lifecycle.json"),
  );
  const first = payrollScenario.scheduled_events[0];
  const payroll = payrollScenario.scheduled_events.find(
    (event) =>
      event.event_type === "enterprise.ledger.posted" &&
      event.payload.purpose === "payroll",
  );
  payroll.tick = 2;
  payroll.payload.causal.previous_step_id = first.payload.causal.step_id;
  assert.throws(
    () => kernel().run(payrollScenario),
    /payroll requires an active employment relationship/,
  );

  const workflowScenario = buildEnterpriseScenario(
    config("professional-services-customer-engagement.json"),
  );
  const transition = workflowScenario.scheduled_events.find(
    (event) =>
      event.event_type === "enterprise.workflow.transitioned" &&
      event.payload.from === "lead",
  );
  transition.payload.to = "undeclared-state";
  assert.throws(
    () => kernel().run(workflowScenario),
    /invalid workflow transition/,
  );
});

test("lineage references real events and deleted records retain inactive provenance", () => {
  const { exported } = run("manufacturing-employee-lifecycle.json");
  const state = enterpriseState(exported);
  const eventIds = new Set(exported.world.event_log.map((event) => event.event_id));
  const lineage = exported.world.observations.filter(
    (observation) => observation.kind === "pii-lineage",
  );
  assert.ok(lineage.length >= 4);
  assert.ok(
    lineage.every((observation) =>
      eventIds.has(observation.attributes.source_event_id),
    ),
  );
  const deleted = Object.values(state.records).find(
    (record) => record.retention_state === "deleted",
  );
  assert.equal(deleted.active, false);
  assert.ok(deleted.history.length >= 3);
});

test("enterprise lineage normalizes as facts-only non-authoritative evidence", () => {
  const { exported } = run("professional-services-customer-engagement.json");
  const normalized = normalizeWorldEvidence(exported);
  assert.equal(normalized.authority, "research-only");
  assert.equal(normalized.release_state, "quarantined");
  assert.ok(normalized.envelopes.length >= 3);
  assert.ok(
    normalized.envelopes.every(
      (envelope) =>
        envelope.verification_status === "derived" &&
        envelope.promotion_state === "quarantined",
    ),
  );
});

test("causal trace links actor, workflow, systems, resources, finance, and data", () => {
  const { scenario, exported } = run(
    "professional-services-customer-engagement.json",
  );
  const terminalStepId = scenario.modules[0].config.terminal_step_id;
  const trace = traceEnterpriseCausality(exported, terminalStepId);
  assert.ok(trace.length >= 10);
  assert.ok(trace.every((step) => step.actor_id && step.action && step.workflow_id));
  assert.ok(trace.some((step) => step.system_id));
  assert.ok(trace.some((step) => step.resource_consequence));
  assert.ok(trace.some((step) => step.financial_consequence));
  assert.ok(trace.some((step) => step.data_consequence));
});

test("employee, procurement, and outage scenarios exercise distinct domain behavior", () => {
  const employee = enterpriseState(
    run("manufacturing-employee-lifecycle.json").exported,
  );
  assert.equal(
    employee.employment[Object.keys(employee.employment)[0]].status,
    "departed",
  );
  assert.ok(employee.ledger.some((journal) => journal.purpose === "payroll"));

  const procurement = enterpriseState(
    run("manufacturing-procurement-to-payment.json").exported,
  );
  assert.ok(procurement.inventory.quantity > getEnterpriseArchetype("manufacturing").initial_inventory * 2);
  assert.ok(
    procurement.ledger.some((journal) => journal.purpose === "supplier-payment"),
  );

  const outage = enterpriseState(run("saas-outage-remediation.json").exported);
  assert.ok(
    Object.values(outage.incidents).some(
      (incident) => incident.status === "remediated",
    ),
  );
  assert.equal(Object.values(outage.workflows)[0], "restored");

  const production = enterpriseState(
    run("manufacturing-production-order.json").exported,
  );
  assert.ok(
    production.operational_outcomes.some(
      (outcome) => outcome.kind === "production",
    ),
  );
  assert.ok(
    production.operational_outcomes.some(
      (outcome) => outcome.kind === "utilisation",
    ),
  );
  assert.ok(
    production.operational_outcomes.some(
      (outcome) => outcome.kind === "backlog",
    ),
  );
});

test("refund and declared failure modes produce deterministic consequences", () => {
  const refundConfig = config("retail-order-to-cash.json");
  refundConfig.scenario_id = "enterprise-retail-refund";
  refundConfig.options.outcome = "refund";
  const refund = enterpriseState(
    kernel().run(buildEnterpriseScenario(refundConfig)),
  );
  assert.ok(Object.values(refund.workflows).includes("refunded"));
  assert.ok(refund.ledger.some((journal) => journal.purpose === "customer-refund"));
  assert.equal(
    refund.inventory.quantity,
    getEnterpriseArchetype("retail").initial_inventory * refundConfig.scale,
  );

  const failureModes = [
    "human-error",
    "delayed-work",
    "failed-approval",
    "duplicate-entry",
    "incorrect-data",
    "misconfiguration",
    "outage",
    "control-failure",
  ];
  for (const [index, failureMode] of failureModes.entries()) {
    const failureConfig = config("saas-outage-remediation.json");
    failureConfig.scenario_id = `enterprise-failure-${index}`;
    failureConfig.options.failure_mode = failureMode;
    const state = enterpriseState(
      kernel().run(buildEnterpriseScenario(failureConfig)),
    );
    assert.ok(
      Object.values(state.incidents).some(
        (incident) =>
          incident.kind === failureMode && incident.status === "remediated",
      ),
      failureMode,
    );
  }
});

test("replay, checkpoint resume, branching, and comparison remain deterministic", async () => {
  const configValue = config("retail-intervention-baseline.json");
  const scenario = buildEnterpriseScenario(configValue);
  const simulationKernel = kernel();
  const original = simulationKernel.run(scenario);
  const replayed = simulationKernel.replay(scenario, original.world.event_log);
  assert.equal(canonicalJson(replayed), canonicalJson(original));

  const checkpoint = simulationKernel.checkpoint(scenario, 10);
  const resumed = simulationKernel.resume(scenario, checkpoint);
  assert.equal(canonicalJson(resumed), canonicalJson(original));

  const intervention = JSON.parse(
    await readFile(
      new URL(
        "../scenarios/interventions/enterprise-inventory-buffer.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const branch = simulationKernel.branch(
    scenario,
    checkpoint,
    intervention.interventions,
  );
  assert.deepEqual(
    branch.world.event_log.slice(0, checkpoint.world.event_log.length),
    checkpoint.world.event_log,
  );
  assert.equal(
    enterpriseState(branch).inventory.quantity,
    enterpriseState(original).inventory.quantity + 20,
  );
  const comparison = compareRuns(original, branch);
  assert.equal(comparison.semantically_equal, false);
  assert.ok(comparison.shared_event_count >= checkpoint.world.event_log.length);
  assert.ok(
    comparison.module_state_differences.some(
      (entry) => entry.module_id === "enterprise-operations",
    ),
  );
  const enterpriseComparison = compareEnterpriseRuns(original, branch);
  assert.equal(enterpriseComparison.materially_equal, false);
  assert.equal(
    enterpriseComparison.observed_synthetic_outcomes.inventory.difference,
    20,
  );
  assert.equal(enterpriseComparison.assumptions.synthetic, true);
  assert.equal(enterpriseComparison.assumptions.authoritative, false);
});
