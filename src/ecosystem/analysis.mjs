import { canonicalCompactJson } from "../canonical-json.mjs";
import { compareRuns } from "../kernel/kernel.mjs";

export function ecosystemState(exported) {
  const state = exported?.world?.projected_state?.module_state?.["ecosystem-operations"];
  if (!state) throw new TypeError("export contains no ecosystem state");
  return structuredClone(state);
}

export function validateEcosystemInvariants(exported) {
  const state = ecosystemState(exported);
  const errors = [];
  for (const payment of Object.values(state.payments)) {
    const total = payment.legs.reduce((sum, leg) => sum + leg.amount, 0);
    if (total !== 0) errors.push(`payment does not reconcile: ${payment.event_id}`);
  }
  for (const contract of Object.values(state.contracts)) {
    for (const partyId of contract.party_ids) {
      const view = state.contract_views[partyId]?.[contract.contract_id];
      if (!view || view.status !== contract.status) {
        errors.push(
          `contract party view does not reconcile: ${contract.contract_id}/${partyId}`,
        );
      }
    }
  }
  for (const delivery of Object.values(state.deliveries)) {
    if (!delivery.sender_id || !delivery.carrier_id || !delivery.recipient_id) {
      errors.push(`delivery lacks reconciled parties: ${delivery.delivery_id}`);
    }
  }
  const contextKeys = new Set();
  for (const [contextId, context] of Object.entries(state.identity_contexts)) {
    const key = `${context.person_id}|${context.context_owner_id}|${context.role}`;
    if (contextKeys.has(key)) errors.push(`collapsed identity context: ${contextId}`);
    contextKeys.add(key);
  }
  for (const transfer of Object.values(state.data_transfers)) {
    const event = exported.world.event_log.find(
      ({ event_id: eventId }) => eventId === transfer.source_event_id,
    );
    if (!event) errors.push(`data transfer lacks source event: ${transfer.record_id}`);
  }
  for (const [stepId, step] of Object.entries(state.causal_steps)) {
    if (step.previous_step_id && !state.causal_steps[step.previous_step_id]) {
      errors.push(`causal predecessor missing: ${stepId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function traceEcosystemCascade(exported, cascadeId) {
  const state = ecosystemState(exported);
  const cascade = state.cascades[cascadeId];
  if (!cascade) throw new TypeError(`unknown ecosystem cascade: ${cascadeId}`);
  return cascade.steps.map((step) => ({
    ...structuredClone(step),
    causal: structuredClone(state.causal_steps[step.causal_step_id]),
  }));
}

export function summarizeEcosystemRun(config, exported) {
  const state = ecosystemState(exported);
  return {
    scenario_id: config.scenario_id,
    scenario_kind: config.scenario_kind,
    scale: config.scale,
    organizations: Object.keys(state.organizations).length,
    contracts: Object.keys(state.contracts).length,
    payments: Object.keys(state.payments).length,
    deliveries: Object.keys(state.deliveries).length,
    identity_contexts: Object.keys(state.identity_contexts).length,
    data_transfers: Object.keys(state.data_transfers).length,
    cascades: Object.keys(state.cascades).length,
    event_count: exported.world.event_log.length,
    digest: exported.digest,
    synthetic: true,
    authoritative: false,
  };
}

export function compareEcosystemRuns(left, right, assumptions = {}) {
  const comparison = compareRuns(left, right);
  const leftState = ecosystemState(left);
  const rightState = ecosystemState(right);
  const outcomeKinds = [
    ...new Set([
      ...Object.keys(leftState.outcomes),
      ...Object.keys(rightState.outcomes),
    ]),
  ].sort();
  return {
    ...comparison,
    assumptions: {
      synthetic: true,
      authoritative: false,
      intervention: structuredClone(assumptions),
    },
    observed_synthetic_outcomes: outcomeKinds.map((kind) => ({
      kind,
      baseline: leftState.outcomes[kind] ?? 0,
      intervention: rightState.outcomes[kind] ?? 0,
      difference:
        (rightState.outcomes[kind] ?? 0) - (leftState.outcomes[kind] ?? 0),
    })),
    ecosystem_state_equal:
      canonicalCompactJson(leftState) === canonicalCompactJson(rightState),
  };
}
