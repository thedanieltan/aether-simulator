import {
  assertExportIntegrity,
  compareRuns,
} from "../kernel/kernel.mjs";

export function enterpriseState(exported) {
  assertExportIntegrity(exported);
  const state =
    exported.world.projected_state.module_state["enterprise-operations"];
  if (!state) throw new TypeError("export contains no enterprise projection");
  return state;
}

export function traceEnterpriseCausality(exported, terminalStepId) {
  const state = enterpriseState(exported);
  const trace = [];
  let stepId = terminalStepId;
  const visited = new Set();
  while (stepId) {
    if (visited.has(stepId)) throw new TypeError("causal chain contains a cycle");
    visited.add(stepId);
    const step = state.causal_steps[stepId];
    if (!step) throw new TypeError(`unknown causal step: ${stepId}`);
    trace.push({ step_id: stepId, ...structuredClone(step) });
    stepId = step.previous_step_id;
  }
  return trace.reverse();
}

export function validateEnterpriseInvariants(exported) {
  const state = enterpriseState(exported);
  const errors = [];

  for (const journal of state.ledger) {
    const debit = journal.entries.reduce((total, entry) => total + entry.debit, 0);
    const credit = journal.entries.reduce((total, entry) => total + entry.credit, 0);
    if (debit !== credit) errors.push(`unbalanced journal: ${journal.journal_id}`);
  }
  if (state.inventory.quantity < 0 && !state.allow_backorders) {
    errors.push("negative inventory without backorder permission");
  }
  if (
    state.capacity.available < 0 ||
    state.capacity.available > state.capacity.total
  ) {
    errors.push("capacity is not conserved");
  }
  for (const [invoiceId, invoice] of Object.entries(state.invoices)) {
    if (invoice.paid > invoice.amount) errors.push(`overpaid invoice: ${invoiceId}`);
    if (invoice.status === "paid" && invoice.paid !== invoice.amount) {
      errors.push(`paid invoice does not reconcile: ${invoiceId}`);
    }
  }

  const eventIds = new Set(exported.world.event_log.map((event) => event.event_id));
  const lineage = exported.world.observations.filter(
    (observation) => observation.kind === "pii-lineage",
  );
  for (const observation of lineage) {
    if (!eventIds.has(observation.attributes.source_event_id)) {
      errors.push(`lineage observation has no source event: ${observation.id}`);
    }
  }
  for (const record of Object.values(state.records)) {
    if (
      ["deleted", "expired"].includes(record.retention_state) &&
      record.active
    ) {
      errors.push(`inactive record remains active: ${record.record_id}`);
    }
    if (record.history.length === 0) {
      errors.push(`record has no provenance history: ${record.record_id}`);
    }
  }
  for (const [stepId, step] of Object.entries(state.causal_steps)) {
    if (step.previous_step_id && !state.causal_steps[step.previous_step_id]) {
      errors.push(`causal step has no predecessor: ${stepId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      workflows: Object.keys(state.workflows).length,
      journals: state.ledger.length,
      invoices: Object.keys(state.invoices).length,
      payments: state.payments.length,
      lineage_observations: lineage.length,
      causal_steps: Object.keys(state.causal_steps).length,
    },
  };
}

export function summarizeEnterpriseRun(config, exported) {
  const state = enterpriseState(exported);
  const invariants = validateEnterpriseInvariants(exported);
  return {
    scenario_id: config.scenario_id,
    archetype: config.archetype,
    journey: config.journey,
    export_digest: exported.digest,
    world_id: exported.world.world_id,
    event_count: exported.world.event_log.length,
    entity_count: Object.values(exported.world.entities).flat().length,
    final_workflow_states: structuredClone(state.workflows),
    inventory_quantity: state.inventory.quantity,
    capacity_available: state.capacity.available,
    journal_count: state.ledger.length,
    invoice_count: Object.keys(state.invoices).length,
    lineage_observation_count: invariants.counts.lineage_observations,
    causal_step_count: invariants.counts.causal_steps,
    invariants_valid: invariants.valid,
  };
}

export function compareEnterpriseRuns(left, right) {
  const generic = compareRuns(left, right);
  const leftState = enterpriseState(left);
  const rightState = enterpriseState(right);
  const workflowIds = [
    ...new Set([
      ...Object.keys(leftState.workflows),
      ...Object.keys(rightState.workflows),
    ]),
  ].sort();
  const workflowDifferences = workflowIds
    .map((workflowId) => ({
      workflow_id: workflowId,
      left: leftState.workflows[workflowId] ?? null,
      right: rightState.workflows[workflowId] ?? null,
    }))
    .filter((entry) => entry.left !== entry.right);
  const inventoryDifference =
    rightState.inventory.quantity - leftState.inventory.quantity;
  const capacityDifference =
    rightState.capacity.available - leftState.capacity.available;

  return {
    contract_version: "aether-enterprise-comparison.v1",
    left_export_id: left.export_id,
    right_export_id: right.export_id,
    shared_event_count: generic.shared_event_count,
    assumptions: {
      right_branch_intervention_digest:
        right.world.branch.intervention_digest,
      synthetic: true,
      authoritative: false,
    },
    observed_synthetic_outcomes: {
      inventory: {
        resource_id: rightState.inventory.resource_id,
        left: leftState.inventory.quantity,
        right: rightState.inventory.quantity,
        difference: inventoryDifference,
      },
      capacity: {
        resource_id: rightState.capacity.resource_id,
        left: leftState.capacity.available,
        right: rightState.capacity.available,
        difference: capacityDifference,
      },
      workflow_differences: workflowDifferences,
      left_operational_outcomes: structuredClone(
        leftState.operational_outcomes,
      ),
      right_operational_outcomes: structuredClone(
        rightState.operational_outcomes,
      ),
    },
    materially_equal:
      inventoryDifference === 0 &&
      capacityDifference === 0 &&
      workflowDifferences.length === 0 &&
      generic.module_state_differences.length === 0,
    generic_comparison: generic,
  };
}
