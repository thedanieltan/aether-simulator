export const ENTITY_RECORD_CONTRACT = "aether-entity-record.v1";
export const ENTITY_INDEX_CONTRACT = "aether-entity-index.v1";

const collectionOrder = [
  "people",
  "households",
  "organizations",
  "institutions",
  "systems",
  "assets",
];
const entityTypes = {
  people: "person",
  households: "household",
  organizations: "organization",
  institutions: "institution",
  systems: "system",
  assets: "asset",
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function collectKnownValues(value, knownIds, found) {
  if (typeof value === "string") {
    if (knownIds.has(value)) found.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectKnownValues(item, knownIds, found);
  } else if (isObject(value)) {
    for (const item of Object.values(value)) collectKnownValues(item, knownIds, found);
  }
}

function endpoints(relationship) {
  return {
    from: relationship.attributes.from_entity_id ?? relationship.attributes.from_id,
    to: relationship.attributes.to_entity_id ?? relationship.attributes.to_id,
  };
}

function displayLabel(entity) {
  return entity.attributes.display_name
    ?? entity.attributes.label
    ?? entity.attributes.name
    ?? `${entity.kind.replaceAll("-", " ")} ${entity.id.slice(-8)}`;
}

function baseContext(relationship, entityId, counterpart) {
  const { from, to } = endpoints(relationship);
  return {
    context_id: relationship.id,
    kind: relationship.kind,
    direction: from === entityId ? "outgoing" : "incoming",
    counterpart_id: counterpart,
    role: relationship.attributes.role ?? null,
    status: relationship.attributes.status ?? null,
    event_id: relationship.attributes.event_id ?? null,
    attributes: structuredClone(relationship.attributes),
  };
}

function identityContexts(world) {
  const moduleState = world.projected_state?.module_state ?? {};
  const ecosystem = moduleState["ecosystem-operations"] ?? {};
  return Object.entries(ecosystem.identity_contexts ?? {})
    .map(([contextId, context]) => ({
      context_id: contextId,
      person_id: context.person_id,
      owner_id: context.context_owner_id,
      role: context.role,
      event_id: context.event_id,
    }))
    .sort((left, right) => left.context_id.localeCompare(right.context_id));
}

function syntheticWorld(world) {
  return world.provenance?.tier === "synthetic"
    && world.provenance?.authoritative === false;
}

export function buildUnifiedEntityIndex(world) {
  if (!isObject(world) || !isObject(world.entities)) {
    throw new TypeError("a versioned world with entity collections is required");
  }
  if (!syntheticWorld(world)) {
    throw new TypeError("unified entity records require a synthetic non-authoritative world");
  }

  const entries = [];
  for (const collection of collectionOrder) {
    for (const entity of world.entities[collection] ?? []) {
      entries.push({ collection, entity });
    }
  }
  const knownIds = new Set(entries.map(({ entity }) => entity.id));
  const identity = identityContexts(world);
  const contextsByEntity = new Map(entries.map(({ entity }) => [entity.id, []]));
  const eventIdsByEntity = new Map(entries.map(({ entity }) => [entity.id, []]));
  const lineageIdsByEntity = new Map(entries.map(({ entity }) => [entity.id, []]));

  for (const relationship of world.relationships ?? []) {
    const { from, to } = endpoints(relationship);
    if (knownIds.has(from) && knownIds.has(to)) {
      contextsByEntity.get(from).push(baseContext(relationship, from, to));
      contextsByEntity.get(to).push(baseContext(relationship, to, from));
    }
  }
  for (const context of identity) {
    if (knownIds.has(context.person_id) && knownIds.has(context.owner_id)) {
      contextsByEntity.get(context.person_id).push({
        context_id: context.context_id,
        kind: "identity-context",
        direction: "member",
        counterpart_id: context.owner_id,
        role: context.role,
        status: null,
        event_id: context.event_id,
        attributes: {},
      });
      contextsByEntity.get(context.owner_id).push({
        context_id: context.context_id,
        kind: "identity-context",
        direction: "owner",
        counterpart_id: context.person_id,
        role: context.role,
        status: null,
        event_id: context.event_id,
        attributes: {},
      });
    }
  }
  for (const event of world.event_log ?? []) {
    const referenced = new Set();
    collectKnownValues(event, knownIds, referenced);
    for (const entityId of referenced) {
      eventIdsByEntity.get(entityId).push(event.event_id);
    }
  }
  for (const observation of world.observations ?? []) {
    if (!observation.kind.includes("lineage")) continue;
    const referenced = new Set();
    collectKnownValues(observation, knownIds, referenced);
    for (const entityId of referenced) {
      lineageIdsByEntity.get(entityId).push(observation.id);
    }
  }

  const records = entries.map(({ collection, entity }) => {
    const contexts = contextsByEntity.get(entity.id);
    if (collection === "people" && entity.attributes.role) {
      for (const context of contexts) {
        if (context.kind === "employment" && !context.role) {
          context.role = entity.attributes.role;
          context.attributes.department = entity.attributes.department ?? null;
        }
      }
    }
    contexts.sort((left, right) =>
      left.context_id.localeCompare(right.context_id)
        || left.direction.localeCompare(right.direction));

    const eventIds = eventIdsByEntity.get(entity.id).sort();
    const lineageFactIds = lineageIdsByEntity.get(entity.id).sort();

    return {
      contract_version: ENTITY_RECORD_CONTRACT,
      entity_id: entity.id,
      entity_type: entityTypes[collection],
      collection,
      kind: entity.kind,
      label: displayLabel(entity),
      synthetic: true,
      authoritative: false,
      attributes: structuredClone(entity.attributes),
      contexts,
      event_ids: eventIds,
      lineage_fact_ids: lineageFactIds,
      provenance: {
        world_id: world.world_id,
        scenario_id: world.scenario_id,
        scenario_digest: world.provenance.scenario_digest,
      },
    };
  });

  records.sort((left, right) =>
    collectionOrder.indexOf(left.collection) - collectionOrder.indexOf(right.collection)
      || left.label.localeCompare(right.label)
      || left.entity_id.localeCompare(right.entity_id));

  const counts = Object.fromEntries(
    collectionOrder.map((collection) => [
      collection,
      records.filter((record) => record.collection === collection).length,
    ]),
  );
  return {
    contract_version: ENTITY_INDEX_CONTRACT,
    world_id: world.world_id,
    synthetic: true,
    authoritative: false,
    counts,
    records,
  };
}

export function findUnifiedEntity(index, entityId) {
  if (index?.contract_version !== ENTITY_INDEX_CONTRACT) {
    throw new TypeError("a unified entity index is required");
  }
  return index.records.find(({ entity_id: id }) => id === entityId) ?? null;
}
