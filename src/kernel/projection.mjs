import { ENTITY_COLLECTIONS, RECORD_COLLECTIONS } from "./contracts.mjs";

function upsert(collection, record) {
  const index = collection.findIndex((item) => item.id === record.id);
  if (index === -1) collection.push(structuredClone(record));
  else collection[index] = structuredClone(record);
  collection.sort((left, right) => left.id.localeCompare(right.id));
}

export function applyCoreProjection(world, event) {
  const { event_type: eventType, payload } = event;
  if (eventType === "core.entity.upserted") {
    if (!ENTITY_COLLECTIONS.includes(payload.collection)) {
      throw new TypeError(`unsupported entity collection: ${payload.collection}`);
    }
    upsert(world.entities[payload.collection], payload.record);
  } else if (eventType === "core.record.upserted") {
    if (!RECORD_COLLECTIONS.includes(payload.collection)) {
      throw new TypeError(`unsupported record collection: ${payload.collection}`);
    }
    upsert(world[payload.collection], payload.record);
  } else if (eventType === "core.balance.adjusted") {
    const balance = world.balances.find((item) => item.id === payload.balance_id);
    if (!balance) throw new TypeError(`unknown balance: ${payload.balance_id}`);
    balance.amount += payload.delta;
  } else if (eventType === "core.balance.set") {
    upsert(world.balances, payload.balance);
  } else if (eventType === "core.metric.recorded") {
    upsert(world.metrics, payload.record);
  } else if (eventType === "core.observation.recorded") {
    upsert(world.observations, payload.record);
  }
}

export function appendEvent(world, event) {
  if (world.event_log.some((item) => item.event_id === event.event_id)) {
    throw new Error(`duplicate event id: ${event.event_id}`);
  }
  world.event_log.push(structuredClone(event));
  world.projected_state.event_count = world.event_log.length;
  world.projected_state.last_event_id = event.event_id;
  world.clock.current_tick = event.tick;
}
