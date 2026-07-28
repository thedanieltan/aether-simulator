import { defineModule } from "../kernel/module.mjs";

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function assertBalanced(entries, journalId) {
  const debit = sum(entries.map((entry) => entry.debit));
  const credit = sum(entries.map((entry) => entry.credit));
  if (debit !== credit) {
    throw new TypeError(`journal ${journalId} is not balanced`);
  }
}

function assertCausalStep(state, event) {
  const causal = event.payload.causal;
  if (!causal?.step_id) {
    throw new TypeError(`enterprise event ${event.event_type} has no causal step`);
  }
  if (
    causal.previous_step_id &&
    !state.causal_steps[causal.previous_step_id]
  ) {
    throw new TypeError(
      `causal predecessor ${causal.previous_step_id} has not occurred`,
    );
  }
  state.causal_steps[causal.step_id] = {
    event_id: event.event_id,
    event_type: event.event_type,
    tick: event.tick,
    previous_step_id: causal.previous_step_id ?? null,
    actor_id: causal.actor_id,
    action: causal.action,
    workflow_id: causal.workflow_id,
    system_id: causal.system_id ?? null,
    resource_consequence: causal.resource_consequence ?? null,
    financial_consequence: causal.financial_consequence ?? null,
    data_consequence: causal.data_consequence ?? null,
  };
}

function initializeState(config) {
  return {
    archetype: config.archetype,
    constraints: structuredClone(config.constraints),
    allow_backorders: config.allow_backorders,
    state_machines: structuredClone(config.state_machines),
    workflows: {},
    ledger: [],
    inventory: {
      resource_id: config.inventory.resource_id,
      quantity: config.inventory.initial_quantity,
    },
    capacity: {
      resource_id: config.capacity.resource_id,
      available: config.capacity.initial_available,
      total: config.capacity.total,
    },
    employment: Object.fromEntries(
      config.employment.map((entry) => [
        entry.relationship_id,
        structuredClone(entry),
      ]),
    ),
    invoices: {},
    payments: [],
    records: {},
    incidents: {},
    operational_outcomes: [],
    causal_steps: {},
    processed_enterprise_events: 0,
  };
}

function reduceWorkflow(state, event) {
  const { workflow_id: workflowId, from, to } = event.payload;
  const definition = state.state_machines[workflowId];
  if (!definition) throw new TypeError(`unknown workflow: ${workflowId}`);
  const current = state.workflows[workflowId] ?? null;
  if (current !== from) {
    throw new TypeError(
      `workflow ${workflowId} expected ${String(current)}, received ${String(from)}`,
    );
  }
  const allowed = definition.transitions
    .filter((transition) => transition.from === from)
    .map((transition) => transition.to);
  if (!allowed.includes(to)) {
    throw new TypeError(`invalid workflow transition ${workflowId}: ${from} -> ${to}`);
  }
  state.workflows[workflowId] = to;
}

function reduceLedger(state, event) {
  const { journal_id: journalId, entries, purpose, employment_relationship_id: employmentId } =
    event.payload;
  assertBalanced(entries, journalId);
  if (purpose === "payroll") {
    const employment = state.employment[employmentId];
    if (!employment || employment.status !== "active") {
      throw new TypeError("payroll requires an active employment relationship");
    }
  }
  state.ledger.push({
    journal_id: journalId,
    event_id: event.event_id,
    purpose,
    entries: structuredClone(entries),
  });
}

function reduceInventory(state, event) {
  const next = state.inventory.quantity + event.payload.delta;
  if (next < 0 && !state.allow_backorders) {
    throw new TypeError("inventory cannot become negative when backorders are disabled");
  }
  state.inventory.quantity = next;
}

function reduceCapacity(state, event) {
  const next = state.capacity.available + event.payload.delta;
  if (next < 0 || next > state.capacity.total) {
    throw new TypeError("capacity change violates the conserved resource boundary");
  }
  state.capacity.available = next;
}

function reduceInvoice(state, event) {
  const { invoice_id: invoiceId, amount } = event.payload;
  if (state.invoices[invoiceId]) throw new TypeError(`duplicate invoice: ${invoiceId}`);
  state.invoices[invoiceId] = {
    amount,
    paid: 0,
    status: "issued",
    issued_event_id: event.event_id,
  };
}

function reducePayment(state, event) {
  const { payment_id: paymentId, invoice_id: invoiceId, amount } = event.payload;
  const invoice = state.invoices[invoiceId];
  if (!invoice) throw new TypeError(`payment references unknown invoice: ${invoiceId}`);
  if (invoice.paid + amount > invoice.amount) {
    throw new TypeError(`payment over-applies invoice: ${invoiceId}`);
  }
  invoice.paid += amount;
  invoice.status = invoice.paid === invoice.amount ? "paid" : "partially-paid";
  state.payments.push({
    payment_id: paymentId,
    invoice_id: invoiceId,
    amount,
    event_id: event.event_id,
  });
}

function reduceEmployment(state, event) {
  const { relationship_id: relationshipId, person_id: personId, status } =
    event.payload;
  const prior = state.employment[relationshipId] ?? {
    relationship_id: relationshipId,
    person_id: personId,
    status: "applicant",
    history: [],
  };
  prior.person_id = personId;
  prior.status = status;
  prior.history = [
    ...(prior.history ?? []),
    { status, event_id: event.event_id, tick: event.tick },
  ];
  state.employment[relationshipId] = prior;
}

function reduceData(state, event) {
  const { record_id: recordId, operation } = event.payload;
  const prior = state.records[recordId] ?? {
    record_id: recordId,
    active: false,
    history: [],
  };
  prior.active = !["deleted", "expired"].includes(operation);
  prior.retention_state = operation;
  prior.history.push({
    operation,
    event_id: event.event_id,
    tick: event.tick,
    copied_from: event.payload.copied_from ?? null,
    transformed_by: event.payload.transformed_by ?? null,
  });
  state.records[recordId] = prior;
}

function reduceIncident(state, event) {
  const { incident_id: incidentId, status, kind } = event.payload;
  const prior = state.incidents[incidentId] ?? {
    incident_id: incidentId,
    kind,
    history: [],
  };
  prior.status = status;
  prior.history.push({ status, event_id: event.event_id, tick: event.tick });
  state.incidents[incidentId] = prior;
}

export const enterpriseOperationsModule = defineModule({
  moduleId: "enterprise-operations",
  version: "1.0.0",
  initialize({ config }) {
    return initializeState(config);
  },
  reduce(state, event) {
    if (!event.event_type.startsWith("enterprise.")) return state;
    assertCausalStep(state, event);
    state.processed_enterprise_events += 1;

    if (event.event_type === "enterprise.workflow.transitioned") {
      reduceWorkflow(state, event);
    } else if (event.event_type === "enterprise.ledger.posted") {
      reduceLedger(state, event);
    } else if (event.event_type === "enterprise.inventory.changed") {
      reduceInventory(state, event);
    } else if (event.event_type === "enterprise.capacity.changed") {
      reduceCapacity(state, event);
    } else if (event.event_type === "enterprise.invoice.issued") {
      reduceInvoice(state, event);
    } else if (event.event_type === "enterprise.payment.applied") {
      reducePayment(state, event);
    } else if (event.event_type === "enterprise.employment.changed") {
      reduceEmployment(state, event);
    } else if (event.event_type === "enterprise.data.changed") {
      reduceData(state, event);
    } else if (event.event_type === "enterprise.incident.changed") {
      reduceIncident(state, event);
    } else if (event.event_type === "enterprise.outcome.recorded") {
      state.operational_outcomes.push({
        event_id: event.event_id,
        kind: event.payload.kind,
        value: event.payload.value,
        unit: event.payload.unit,
      });
    }
    return state;
  },
  afterEvent(event, context) {
    if (event.event_type === "enterprise.ledger.posted") {
      return event.payload.postings.map((posting) => ({
        tick: event.tick + 1,
        module_id: "enterprise-operations",
        event_type: "core.balance.adjusted",
        entity_id: event.entity_id,
        causes: [event.event_id],
        payload: {
          balance_id: posting.balance_id,
          delta: posting.delta,
        },
      }));
    }
    if (event.event_type === "enterprise.data.changed") {
      const observationId = context.stableId("observation", {
        source_event_id: event.event_id,
        record_id: event.payload.record_id,
      });
      return [
        {
          tick: event.tick + 1,
          module_id: "enterprise-operations",
          event_type: "core.observation.recorded",
          entity_id: event.entity_id,
          causes: [event.event_id],
          payload: {
            record: {
              id: observationId,
              kind: "pii-lineage",
              attributes: {
                source_record_ref: event.payload.record_id,
                source_event_id: event.event_id,
                subject_ref: event.payload.subject_ref,
                system_ref: event.payload.system_id,
                role_context: event.payload.role_context,
                system_surface: event.payload.system_surface,
                fields: structuredClone(event.payload.fields),
                access_role_ids: structuredClone(event.payload.access_role_ids),
                retention_state: event.payload.operation,
                copied_from: event.payload.copied_from ?? null,
                transformed_by: event.payload.transformed_by ?? null,
                simulation_tick: event.tick,
                provenance_tier: "synthetic",
              },
            },
          },
        },
      ];
    }
    if (event.event_type === "enterprise.outcome.recorded") {
      return [
        {
          tick: event.tick + 1,
          module_id: "enterprise-operations",
          event_type: "core.metric.recorded",
          entity_id: event.entity_id,
          causes: [event.event_id],
          payload: {
            record: {
              id: context.stableId("metric", {
                source_event_id: event.event_id,
                kind: event.payload.kind,
              }),
              kind: event.payload.kind,
              attributes: {
                value: event.payload.value,
                unit: event.payload.unit,
                source_event_id: event.event_id,
              },
            },
          },
        },
      ];
    }
    return [];
  },
});
