import { defineModule } from "../kernel/module.mjs";

export const baselineOperationsModule = defineModule({
  moduleId: "baseline-operations",
  version: "1.0.0",
  initialize({ config }) {
    return {
      configured_balance_id: config.balance_id,
      handled_events: 0,
      last_event_type: null,
    };
  },
  schedule({ config }) {
    return [
      {
        tick: config.activity_tick,
        module_id: "baseline-operations",
        event_type: "baseline.activity.started",
        entity_id: config.organization_id,
        payload: {
          account_id: config.account_id,
          balance_id: config.balance_id,
        },
      },
    ];
  },
  reduce(state, event) {
    if (event.module_id === "baseline-operations") {
      state.handled_events += 1;
      state.last_event_type = event.event_type;
    }
    return state;
  },
  afterEvent(event, context) {
    if (
      event.module_id !== "baseline-operations" ||
      event.event_type !== "baseline.activity.started"
    ) {
      return [];
    }
    const amount = context
      .random({ entityId: event.entity_id, purpose: "activity-value" })
      .integer(100, 500);
    const metricId = context.stableId("metric", {
      event_id: event.event_id,
      kind: "synthetic-activity-value",
    });
    return [
      {
        tick: event.tick + 1,
        module_id: "baseline-operations",
        event_type: "core.balance.adjusted",
        entity_id: event.entity_id,
        causes: [event.event_id],
        payload: {
          balance_id: context.config.balance_id,
          delta: amount,
        },
      },
      {
        tick: event.tick + 2,
        module_id: "baseline-operations",
        event_type: "core.metric.recorded",
        entity_id: event.entity_id,
        causes: [event.event_id],
        payload: {
          record: {
            id: metricId,
            kind: "synthetic-activity-value",
            attributes: {
              value: amount,
              unit: "synthetic-credit",
              source_event_id: event.event_id,
            },
          },
        },
      },
    ];
  },
});
