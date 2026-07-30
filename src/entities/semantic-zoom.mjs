import { buildUnifiedEntityIndex } from "./unified.mjs";

export const SEMANTIC_ZOOM_CONTRACT = "aether-semantic-zoom.v1";

export function buildSemanticZoomModel(world) {
  const index = buildUnifiedEntityIndex(world);
  const recordsById = new Map(
    index.records.map((record) => [record.entity_id, record]),
  );
  const citizens = index.records.filter(({ collection }) => collection === "people");
  const enterprises = index.records
    .filter(({ collection }) => collection === "organizations")
    .map((organization) => {
      const citizenIds = citizens
        .filter(({ contexts }) =>
          contexts.some(({ counterpart_id: counterpartId }) =>
            counterpartId === organization.entity_id))
        .map(({ entity_id: entityId }) => entityId)
        .sort();
      const relatedEntityIds = organization.contexts
        .map(({ counterpart_id: counterpartId }) => counterpartId)
        .filter((entityId) => recordsById.has(entityId))
        .sort();
      return {
        enterprise_id: organization.entity_id,
        label: organization.label,
        kind: organization.kind,
        citizen_ids: citizenIds,
        related_entity_ids: relatedEntityIds,
        event_ids: [...organization.event_ids],
        lineage_fact_ids: [...organization.lineage_fact_ids],
      };
    })
    .sort((left, right) =>
      right.citizen_ids.length - left.citizen_ids.length
        || left.label.localeCompare(right.label)
        || left.enterprise_id.localeCompare(right.enterprise_id));
  const assignedCitizenIds = new Set(
    enterprises.flatMap(({ citizen_ids: citizenIds }) => citizenIds),
  );
  const paths = enterprises
    .flatMap((enterprise) =>
      enterprise.citizen_ids.map((citizenId) => ({
        world_id: world.world_id,
        enterprise_id: enterprise.enterprise_id,
        citizen_id: citizenId,
      })))
    .sort((left, right) =>
      left.enterprise_id.localeCompare(right.enterprise_id)
        || left.citizen_id.localeCompare(right.citizen_id));

  return {
    contract_version: SEMANTIC_ZOOM_CONTRACT,
    synthetic: true,
    authoritative: false,
    world: {
      world_id: world.world_id,
      scenario_id: world.scenario_id,
      enterprise_ids: enterprises.map(({ enterprise_id: enterpriseId }) => enterpriseId),
      citizen_count: citizens.length,
      connected_citizen_count: assignedCitizenIds.size,
    },
    enterprises,
    paths,
    records: index.records,
  };
}

export function resolveSemanticZoom(model, selection = {}) {
  if (model?.contract_version !== SEMANTIC_ZOOM_CONTRACT) {
    throw new TypeError("a semantic zoom model is required");
  }
  const enterprise = selection.enterpriseId
    ? model.enterprises.find(
      ({ enterprise_id: enterpriseId }) => enterpriseId === selection.enterpriseId,
    )
    : null;
  if (selection.enterpriseId && !enterprise) {
    throw new TypeError("the selected enterprise is not in this world");
  }
  const citizen = selection.citizenId
    ? model.records.find(
      ({ entity_id: entityId, collection }) =>
        entityId === selection.citizenId && collection === "people",
    )
    : null;
  if (selection.citizenId && !citizen) {
    throw new TypeError("the selected citizen is not in this world");
  }
  if (citizen && !enterprise?.citizen_ids.includes(citizen.entity_id)) {
    throw new TypeError("the selected citizen has no declared context in this enterprise");
  }
  return {
    level: citizen ? "citizen" : enterprise ? "enterprise" : "world",
    enterprise,
    citizen,
  };
}

