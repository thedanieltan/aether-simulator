import { canonicalCompactJson } from "../canonical-json.mjs";
import { CONTRACTS } from "./contracts.mjs";
import { stableId } from "./ids.mjs";

export function compareEvents(left, right) {
  return (
    left.tick - right.tick ||
    left.priority - right.priority ||
    left.module_id.localeCompare(right.module_id) ||
    left.event_type.localeCompare(right.event_type) ||
    (left.entity_id ?? "").localeCompare(right.entity_id ?? "") ||
    left.event_id.localeCompare(right.event_id)
  );
}

export function normalizeEventIntents({
  intents,
  scenarioId,
  branchId,
  origin,
  emissionSource,
}) {
  const prepared = intents.map((intent) => ({
    tick: intent.tick,
    priority: intent.priority ?? 0,
    module_id: intent.module_id,
    event_type: intent.event_type,
    entity_id: intent.entity_id ?? null,
    causes: [...(intent.causes ?? [])].sort(),
    payload: structuredClone(intent.payload ?? {}),
  }));

  prepared.sort((left, right) =>
    left.tick - right.tick ||
    left.priority - right.priority ||
    left.module_id.localeCompare(right.module_id) ||
    left.event_type.localeCompare(right.event_type) ||
    (left.entity_id ?? "").localeCompare(right.entity_id ?? "") ||
    canonicalCompactJson(left.payload).localeCompare(
      canonicalCompactJson(right.payload),
    ),
  );

  const occurrences = new Map();
  return prepared.map((intent) => {
    const semanticKey = canonicalCompactJson(intent);
    const occurrence = occurrences.get(semanticKey) ?? 0;
    occurrences.set(semanticKey, occurrence + 1);
    return {
      contract_version: CONTRACTS.event,
      event_id: stableId("event", {
        scenario_id: scenarioId,
        branch_id: branchId,
        emission_source: emissionSource,
        occurrence,
        intent,
      }),
      ...intent,
      provenance: {
        origin,
        tier: "synthetic",
        authoritative: false,
      },
    };
  });
}
