export const ANALYSIS_CONTRACT = "aether-analysis.v1";

function sortedEntries(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({ key, count }));
}

export function analyzeSyntheticWorld(exported) {
  const world = exported?.world;
  if (
    !world
    || world.provenance?.tier !== "synthetic"
    || world.provenance?.authoritative !== false
  ) {
    throw new TypeError("analysis requires a synthetic non-authoritative world export");
  }
  const entityCounts = {};
  const cohorts = [];
  for (const [collection, entities] of Object.entries(world.entities)) {
    entityCounts[collection] = entities.length;
    const kinds = {};
    for (const entity of entities) {
      kinds[entity.kind] = (kinds[entity.kind] ?? 0) + 1;
    }
    for (const { key: kind, count } of sortedEntries(kinds)) {
      cohorts.push({ collection, kind, count });
    }
  }
  cohorts.sort((left, right) =>
    left.collection.localeCompare(right.collection)
      || left.kind.localeCompare(right.kind));

  const eventIds = new Set(world.event_log.map(({ event_id: eventId }) => eventId));
  const eventKinds = {};
  const ancestry = [];
  for (const event of world.event_log) {
    eventKinds[event.event_type] = (eventKinds[event.event_type] ?? 0) + 1;
    for (const causeId of event.causes) {
      ancestry.push({
        cause_event_id: causeId,
        effect_event_id: event.event_id,
        declared: true,
        resolved: eventIds.has(causeId),
      });
    }
  }
  ancestry.sort((left, right) =>
    left.effect_event_id.localeCompare(right.effect_event_id)
      || left.cause_event_id.localeCompare(right.cause_event_id));

  return {
    contract_version: ANALYSIS_CONTRACT,
    synthetic: true,
    authoritative: false,
    world_id: world.world_id,
    scenario_id: world.scenario_id,
    digest: exported.digest,
    measures: {
      entities: Object.values(entityCounts).reduce((sum, count) => sum + count, 0),
      events: world.event_log.length,
      relationships: world.relationships.length,
      observations: world.observations.length,
      lineage_facts: world.observations.filter(({ kind }) =>
        kind.includes("lineage")).length,
    },
    entity_counts: entityCounts,
    event_kinds: sortedEntries(eventKinds),
    cohorts,
    declared_event_ancestry: ancestry,
    interpretation: {
      statistical_uncertainty_estimated: false,
      calibrated: false,
      causal_effect_estimated: false,
      statement:
        "Measures describe one deterministic synthetic run; event ancestry records declared model links, not estimated real-world causal effects.",
      limitations: [...world.limitations],
    },
  };
}

