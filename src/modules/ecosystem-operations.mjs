import { defineModule } from "../kernel/module.mjs";
import { assertEcosystemEvent } from "../ecosystem/validation.mjs";

function includesAll(values, expected) {
  const set = new Set(values);
  return expected.every((value) => set.has(value));
}

function activeContract(state, contractId, organizationIds) {
  const contract = state.contracts[contractId];
  if (!contract || !["active", "amended", "renewed", "disputed"].includes(contract.status)) {
    throw new TypeError(`cross-boundary event requires active contract: ${contractId}`);
  }
  if (!includesAll(contract.party_ids, organizationIds)) {
    throw new TypeError(`contract ${contractId} does not cover every affected organization`);
  }
  return contract;
}

function recordCausalStep(state, event) {
  const causal = event.payload.causal;
  if (
    causal.previous_step_id &&
    !state.causal_steps[causal.previous_step_id]
  ) {
    throw new TypeError(
      `ecosystem causal predecessor has not occurred: ${causal.previous_step_id}`,
    );
  }
  state.causal_steps[causal.step_id] = {
    event_id: event.event_id,
    tick: event.tick,
    previous_step_id: causal.previous_step_id,
    actor_id: causal.actor_id,
    action: causal.action,
    organization_ids: structuredClone(causal.organization_ids),
    operational_consequence: structuredClone(causal.operational_consequence),
    financial_consequence: structuredClone(causal.financial_consequence),
    data_consequence: structuredClone(causal.data_consequence),
  };
}

function assertBoundary(state, event) {
  const boundary = event.payload.boundary;
  if (!boundary) return;
  const affected = [
    boundary.owner_organization_id,
    ...boundary.affected_organization_ids,
  ];
  for (const organizationId of affected) {
    if (!state.organizations[organizationId]) {
      throw new TypeError(`unknown organization boundary: ${organizationId}`);
    }
  }
  activeContract(state, boundary.contract_id, [...new Set(affected)]);
}

function reduceContract(state, event) {
  const {
    contract_id: contractId,
    action,
    party_ids: partyIds,
    contract_kind: contractKind,
  } = event.payload;
  if (action === "formed") {
    if (state.contracts[contractId]) {
      throw new TypeError(`duplicate ecosystem contract: ${contractId}`);
    }
    if (new Set(partyIds).size !== partyIds.length || partyIds.length < 2) {
      throw new TypeError("ecosystem contracts require distinct counterparties");
    }
    for (const partyId of partyIds) {
      if (!state.organizations[partyId]) {
        throw new TypeError(`contract references unknown organization: ${partyId}`);
      }
    }
    state.contracts[contractId] = {
      contract_id: contractId,
      contract_kind: contractKind,
      party_ids: structuredClone(partyIds),
      status: "active",
      history: [],
    };
    for (const partyId of partyIds) {
      state.contract_views[partyId] ??= {};
      state.contract_views[partyId][contractId] = {
        counterparty_ids: partyIds.filter((id) => id !== partyId),
        status: "active",
      };
    }
  } else {
    const contract = activeContract(state, contractId, partyIds);
    const statuses = {
      amended: "amended",
      renewed: "renewed",
      disputed: "disputed",
      terminated: "terminated",
    };
    if (!statuses[action]) throw new TypeError(`unsupported contract action: ${action}`);
    contract.status = statuses[action];
    for (const partyId of contract.party_ids) {
      state.contract_views[partyId][contractId].status = statuses[action];
    }
  }
  state.contracts[contractId].history.push({
    action,
    event_id: event.event_id,
    tick: event.tick,
  });
}

function reducePayment(state, event) {
  assertBoundary(state, event);
  const { payment_id: paymentId, legs } = event.payload;
  if (state.payments[paymentId]) throw new TypeError(`duplicate payment: ${paymentId}`);
  const total = legs.reduce((sum, leg) => sum + leg.amount, 0);
  if (total !== 0) throw new TypeError(`payment ${paymentId} does not reconcile to zero`);
  const organizations = legs.map((leg) => leg.organization_id);
  activeContract(state, event.payload.boundary.contract_id, organizations);
  for (const leg of legs) {
    state.organization_balances[leg.organization_id] += leg.amount;
  }
  state.payments[paymentId] = {
    event_id: event.event_id,
    legs: structuredClone(legs),
    amount: Math.max(...legs.map((leg) => leg.amount)),
  };
}

function reduceDelivery(state, event) {
  assertBoundary(state, event);
  const {
    delivery_id: deliveryId,
    sender_id: senderId,
    carrier_id: carrierId,
    recipient_id: recipientId,
    status,
  } = event.payload;
  activeContract(
    state,
    event.payload.boundary.contract_id,
    [senderId, carrierId, recipientId],
  );
  const delivery = state.deliveries[deliveryId] ?? {
    delivery_id: deliveryId,
    sender_id: senderId,
    carrier_id: carrierId,
    recipient_id: recipientId,
    history: [],
  };
  delivery.status = status;
  delivery.history.push({ status, event_id: event.event_id, tick: event.tick });
  state.deliveries[deliveryId] = delivery;
}

function reduceIdentityContext(state, event) {
  const {
    person_id: personId,
    context_owner_id: ownerId,
    role,
    context_id: contextId,
  } = event.payload;
  if (!state.people[personId]) throw new TypeError(`unknown shared citizen: ${personId}`);
  if (state.identity_contexts[contextId]) {
    throw new TypeError(`duplicate identity context: ${contextId}`);
  }
  state.identity_contexts[contextId] = {
    person_id: personId,
    context_owner_id: ownerId,
    role,
    event_id: event.event_id,
  };
}

function reduceDataTransfer(state, event) {
  assertBoundary(state, event);
  const {
    transfer_id: transferId,
    record_id: recordId,
    from_organization_id: fromId,
    to_organization_id: toId,
    operation,
  } = event.payload;
  activeContract(state, event.payload.boundary.contract_id, [fromId, toId]);
  state.data_transfers[transferId] = {
    record_id: recordId,
    from_organization_id: fromId,
    to_organization_id: toId,
    operation,
    source_event_id: event.event_id,
    active: !["deleted", "expired"].includes(operation),
  };
}

function reduceCascade(state, event) {
  assertBoundary(state, event);
  const {
    cascade_id: cascadeId,
    organization_id: organizationId,
    impact_kind: impactKind,
    value,
  } = event.payload;
  const cascade = state.cascades[cascadeId] ?? {
    cascade_id: cascadeId,
    steps: [],
  };
  cascade.steps.push({
    organization_id: organizationId,
    impact_kind: impactKind,
    value,
    event_id: event.event_id,
    causal_step_id: event.payload.causal.step_id,
  });
  state.cascades[cascadeId] = cascade;
  state.outcomes[impactKind] = (state.outcomes[impactKind] ?? 0) + value;
}

function initializeState(config) {
  return {
    organizations: Object.fromEntries(
      config.organizations.map((organization) => [
        organization.id,
        structuredClone(organization),
      ]),
    ),
    people: Object.fromEntries(
      config.people.map((person) => [person.id, structuredClone(person)]),
    ),
    balance_ids: structuredClone(config.balance_ids),
    organization_balances: structuredClone(config.organization_balances),
    contracts: {},
    payments: {},
    contract_views: {},
    deliveries: {},
    identity_contexts: {},
    data_transfers: {},
    obligations: {},
    transactions: {},
    employment_movements: [],
    cascades: {},
    outcomes: {},
    causal_steps: {},
    processed_ecosystem_events: 0,
  };
}

export const ecosystemOperationsModule = defineModule({
  moduleId: "ecosystem-operations",
  version: "1.0.0",
  initialize({ config }) {
    return initializeState(config);
  },
  reduce(state, event) {
    if (!event.event_type.startsWith("ecosystem.")) return state;
    assertEcosystemEvent(event.payload);
    recordCausalStep(state, event);
    state.processed_ecosystem_events += 1;

    if (event.event_type === "ecosystem.contract.changed") {
      reduceContract(state, event);
    } else if (event.event_type === "ecosystem.payment.recorded") {
      reducePayment(state, event);
    } else if (event.event_type === "ecosystem.delivery.changed") {
      reduceDelivery(state, event);
    } else if (event.event_type === "ecosystem.identity.context-added") {
      reduceIdentityContext(state, event);
    } else if (event.event_type === "ecosystem.data.transferred") {
      reduceDataTransfer(state, event);
    } else if (event.event_type === "ecosystem.cascade.propagated") {
      reduceCascade(state, event);
    } else if (event.event_type === "ecosystem.obligation.changed") {
      assertBoundary(state, event);
      state.obligations[event.payload.obligation_id] = {
        kind: event.payload.obligation_kind,
        status: event.payload.status,
        deadline_tick: event.payload.deadline_tick,
        event_id: event.event_id,
      };
    } else if (event.event_type === "ecosystem.transaction.recorded") {
      assertBoundary(state, event);
      state.transactions[event.payload.transaction_id] = {
        transaction_kind: event.payload.transaction_kind,
        status: event.payload.status,
        amount: event.payload.amount,
        event_id: event.event_id,
      };
    } else if (event.event_type === "ecosystem.employment.moved") {
      assertBoundary(state, event);
      state.employment_movements.push({
        person_id: event.payload.person_id,
        from_organization_id: event.payload.from_organization_id,
        to_organization_id: event.payload.to_organization_id,
        event_id: event.event_id,
      });
    }
    return state;
  },
  afterEvent(event, context) {
    if (event.event_type === "ecosystem.payment.recorded") {
      return event.payload.legs.map((leg) => ({
        tick: event.tick + 1,
        module_id: "ecosystem-operations",
        event_type: "core.balance.adjusted",
        entity_id: leg.organization_id,
        causes: [event.event_id],
        payload: {
          balance_id: context.config.balance_ids[leg.organization_id],
          delta: leg.amount,
        },
      }));
    }
    if (event.event_type === "ecosystem.data.transferred") {
      return [
        {
          tick: event.tick + 1,
          module_id: "ecosystem-operations",
          event_type: "core.observation.recorded",
          entity_id: event.payload.to_organization_id,
          causes: [event.event_id],
          payload: {
            record: {
              id: context.stableId("observation", {
                source_event_id: event.event_id,
                transfer_id: event.payload.transfer_id,
              }),
              kind: "cross-organization-pii-lineage",
              attributes: {
                source_event_id: event.event_id,
                transfer_id: event.payload.transfer_id,
                record_id: event.payload.record_id,
                from_organization_id: event.payload.from_organization_id,
                to_organization_id: event.payload.to_organization_id,
                operation: event.payload.operation,
                provenance_tier: "synthetic",
                authoritative: false,
              },
            },
          },
        },
      ];
    }
    return [];
  },
});
