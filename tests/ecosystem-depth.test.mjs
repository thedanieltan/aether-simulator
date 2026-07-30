import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  buildEcosystemIntervention,
  buildEcosystemScenario,
  canonicalJson,
  compareEcosystemRuns,
  ecosystemOperationsModule,
  ecosystemScenarioMetadata,
  ecosystemState,
  enterpriseOperationsModule,
  SimulationKernel,
  traceEcosystemCascade,
  validateEcosystemConfig,
  validateEcosystemInvariants,
} from "../src/index.mjs";

const scenarioDirectory = new URL("../scenarios/ecosystem/", import.meta.url);
const names = (await readdir(scenarioDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const configs = await Promise.all(
  names.map(async (name) =>
    JSON.parse(await readFile(new URL(name, scenarioDirectory), "utf8")),
  ),
);
const byKind = new Map(configs.map((config) => [config.scenario_kind, config]));
const kernel = new SimulationKernel({
  modules: [enterpriseOperationsModule, ecosystemOperationsModule],
});

test("all ecosystem configs run deterministically with invariant-safe state", () => {
  assert.equal(configs.length, 7);
  for (const config of configs) {
    const scenario = buildEcosystemScenario(config);
    const first = kernel.run(scenario);
    const second = kernel.run(scenario);
    assert.equal(canonicalJson(first), canonicalJson(second));
    assert.deepEqual(validateEcosystemInvariants(first), { valid: true, errors: [] });
    assert.equal(first.world.provenance.authoritative, false);
    assert.equal(first.world.provenance.external_credentials_used, false);
  }
});

test("contracts and intermediated payments reconcile across all parties", () => {
  const config = byKind.get("retail-supply-network");
  const exported = kernel.run(buildEcosystemScenario(config));
  const state = ecosystemState(exported);
  const [contract] = Object.values(state.contracts);
  assert.equal(contract.party_ids.length, 5);
  assert.equal(contract.status, "renewed");
  for (const partyId of contract.party_ids) {
    assert.equal(
      state.contract_views[partyId][contract.contract_id].status,
      contract.status,
    );
  }
  const [payment] = Object.values(state.payments);
  assert.equal(payment.legs.reduce((sum, leg) => sum + leg.amount, 0), 0);
  assert.equal(payment.legs.length, 5);
  for (const [organizationId, amount] of Object.entries(
    state.organization_balances,
  )) {
    const balanceId = state.balance_ids[organizationId];
    const worldBalance = exported.world.balances.find(({ id }) => id === balanceId);
    assert.equal(worldBalance.amount, amount);
  }
});

test("deliveries reconcile sender, carrier, recipient, and acceptance", () => {
  const exported = kernel.run(
    buildEcosystemScenario(byKind.get("retail-supply-network")),
  );
  const [delivery] = Object.values(ecosystemState(exported).deliveries);
  assert.equal(delivery.status, "accepted");
  assert.deepEqual(
    delivery.history.map(({ status }) => status),
    ["rejected", "accepted"],
  );
  assert.notEqual(delivery.sender_id, delivery.carrier_id);
  assert.notEqual(delivery.carrier_id, delivery.recipient_id);
  const [obligation] = Object.values(ecosystemState(exported).obligations);
  assert.equal(obligation.status, "remediated");
});

test("shared citizens retain stable identity with separate contexts", () => {
  const exported = kernel.run(
    buildEcosystemScenario(byKind.get("saas-service-network")),
  );
  const contexts = Object.values(ecosystemState(exported).identity_contexts);
  assert.equal(new Set(contexts.map(({ person_id: id }) => id)).size, 1);
  assert.equal(new Set(contexts.map(({ context_owner_id: id }) => id)).size, 5);
  assert.ok(contexts.some(({ role }) => role === "employee"));
  assert.ok(contexts.some(({ role }) => role === "household-member"));
  assert.ok(contexts.some(({ role }) => role === "vendor-representative"));
});

test("employment movement preserves the shared citizen across organizations", () => {
  const exported = kernel.run(
    buildEcosystemScenario(byKind.get("professional-services-network")),
  );
  const state = ecosystemState(exported);
  assert.equal(state.employment_movements.length, 1);
  const [movement] = state.employment_movements;
  assert.ok(state.people[movement.person_id]);
  assert.notEqual(movement.from_organization_id, movement.to_organization_id);
  assert.ok(state.organizations[movement.from_organization_id]);
  assert.ok(state.organizations[movement.to_organization_id]);
});

test("undeclared cross-organization mutation fails closed", () => {
  const config = byKind.get("saas-service-network");
  const invalid = buildEcosystemScenario(config);
  const metadata = ecosystemScenarioMetadata(config);
  invalid.scheduled_events.push({
    tick: 1,
    module_id: "ecosystem-operations",
    event_type: "ecosystem.transaction.recorded",
    entity_id: metadata.organization_ids[0],
    payload: {
      contract_version: "aether-ecosystem-event.v1",
      event_kind: "transaction",
      boundary: {
        owner_organization_id: metadata.organization_ids[0],
        affected_organization_ids: [metadata.organization_ids[1]],
        contract_id: metadata.contract_id,
      },
      transaction_id: metadata.cascade_id,
      transaction_kind: "unauthorized-write",
      status: "rejected",
      amount: 0,
      causal: {
        step_id: metadata.cascade_id,
        previous_step_id: null,
        actor_id: metadata.person_id,
        action: "attempt-undeclared-mutation",
        organization_ids: metadata.organization_ids.slice(0, 2),
        operational_consequence: null,
        financial_consequence: null,
        data_consequence: null,
      },
    },
  });
  assert.throws(() => kernel.run(invalid), /requires active contract/);
});

test("cascade causality is queryable end to end across organizations", () => {
  const config = byKind.get("vendor-outage-cascade");
  const exported = kernel.run(buildEcosystemScenario(config));
  const metadata = ecosystemScenarioMetadata(config);
  const trace = traceEcosystemCascade(exported, metadata.cascade_id);
  assert.equal(trace.length, metadata.organization_ids.length);
  assert.deepEqual(
    new Set(trace.map(({ organization_id: id }) => id)),
    new Set(metadata.organization_ids),
  );
  for (const step of trace) {
    assert.ok(step.causal.event_id);
    assert.ok(step.causal.action.includes("vendor-outage"));
  }
});

test("cross-organization lineage references actual synthetic events", () => {
  const exported = kernel.run(
    buildEcosystemScenario(byKind.get("cross-organization-data-request")),
  );
  const state = ecosystemState(exported);
  const [transfer] = Object.values(state.data_transfers);
  assert.ok(
    exported.world.event_log.some(
      ({ event_id: eventId }) => eventId === transfer.source_event_id,
    ),
  );
  const observation = exported.world.observations.find(
    ({ kind }) => kind === "cross-organization-pii-lineage",
  );
  assert.equal(observation.attributes.source_event_id, transfer.source_event_id);
  assert.equal(observation.attributes.authoritative, false);
});

test("checkpoint, resume, replay, branch, and intervention remain deterministic", () => {
  const config = byKind.get("ecosystem-intervention-baseline");
  const scenario = buildEcosystemScenario(config);
  const metadata = ecosystemScenarioMetadata(config);
  const checkpointTick = metadata.next_tick - 1;
  const original = kernel.run(scenario);
  const checkpoint = kernel.checkpoint(scenario, checkpointTick);
  assert.equal(
    canonicalJson(kernel.resume(scenario, checkpoint)),
    canonicalJson(original),
  );
  assert.equal(
    canonicalJson(kernel.replay(scenario, original.world.event_log)),
    canonicalJson(original),
  );
  const interventions = buildEcosystemIntervention(config);
  const branch = kernel.branch(scenario, checkpoint, interventions);
  assert.equal(
    canonicalJson(branch),
    canonicalJson(kernel.branch(scenario, checkpoint, interventions)),
  );
  const comparison = compareEcosystemRuns(original, branch, {
    kind: "capacity-restoration",
  });
  const restoration = comparison.observed_synthetic_outcomes.find(
    ({ kind }) => kind === "capacity-restoration",
  );
  assert.equal(restoration.difference, 75);
  assert.equal(comparison.assumptions.authoritative, false);
});

test("partition size does not change scenario or semantic output", () => {
  const config = {
    ...byKind.get("retail-supply-network"),
    scenario_id: "ecosystem-retail-partition-equivalence",
    scale: 4,
  };
  const single = buildEcosystemScenario(config, { partitionSize: 1 });
  const batched = buildEcosystemScenario(config, { partitionSize: 3 });
  assert.equal(canonicalJson(single), canonicalJson(batched));
  assert.equal(
    canonicalJson(kernel.run(single)),
    canonicalJson(kernel.run(batched)),
  );
});

test("contract lifecycle and required transaction families are represented", () => {
  const events = configs.flatMap((config) =>
    buildEcosystemScenario(config).scheduled_events,
  );
  const contractActions = new Set(
    events
      .filter(({ event_type: type }) => type === "ecosystem.contract.changed")
      .map(({ payload }) => payload.action),
  );
  for (const action of ["formed", "amended", "renewed", "disputed", "terminated"]) {
    assert.ok(contractActions.has(action), action);
  }
  const transactionKinds = new Set(
    events
      .filter(({ event_type: type }) => type === "ecosystem.transaction.recorded")
      .map(({ payload }) => payload.transaction_kind),
  );
  for (const kind of [
    "order",
    "purchase-order",
    "invoice",
    "refund",
    "credit",
    "return",
    "subscription",
    "usage",
    "support",
    "data-request",
    "notification",
    "remediation",
  ]) {
    assert.ok(transactionKinds.has(kind), kind);
  }
  assert.ok(
    events.some(
      ({ event_type: eventType }) =>
        eventType === "ecosystem.employment.moved",
    ),
  );
  const cascadeKinds = new Set(
    events
      .filter(({ event_type: type }) => type === "ecosystem.cascade.propagated")
      .map(({ payload }) => payload.impact_kind),
  );
  for (const kind of [
    "vendor-outage",
    "payment-provider-failure",
    "customer-default",
    "supplier-delay",
    "privacy-incident-propagation",
    "contract-termination",
    "logistics-disruption",
    "upstream-price-change",
    "upstream-capacity-change",
  ]) {
    assert.ok(cascadeKinds.has(kind), kind);
  }
});

test("configuration validation fails closed", () => {
  const invalid = {
    ...byKind.get("saas-service-network"),
    scale: 0,
  };
  const result = validateEcosystemConfig(invalid);
  assert.equal(result.valid, false);
  assert.throws(() => buildEcosystemScenario(invalid), /invalid ecosystem config/);
});
