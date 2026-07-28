import { CONTRACTS } from "./contracts.mjs";
import { stableId } from "./ids.mjs";
import { SimulationKernel } from "./kernel.mjs";

export function legacyWorldToScenario(legacyWorld) {
  if (legacyWorld?.contract_version !== "aether-world.v0.1") {
    throw new TypeError("unsupported legacy world contract version");
  }
  if (legacyWorld?.provenance?.tier !== "synthetic") {
    throw new TypeError("legacy migration accepts synthetic worlds only");
  }
  if (legacyWorld?.company?.fictional !== true) {
    throw new TypeError("legacy company must be explicitly fictional");
  }

  const scenarioId = `migrated-${legacyWorld.world_ref}`;
  const organizationId = stableId("organization", {
    legacy_id: legacyWorld.company.id,
    world_ref: legacyWorld.world_ref,
  });
  const systems = legacyWorld.systems.map((system) => ({
    id: stableId("system", {
      legacy_id: system.id,
      world_ref: legacyWorld.world_ref,
    }),
    kind: system.kind,
    attributes: {
      display_name: system.name,
      surface: system.surface,
      external: system.external,
      legacy_id: system.id,
    },
  }));
  const systemIdByLegacyId = new Map(
    legacyWorld.systems.map((system, index) => [system.id, systems[index].id]),
  );
  const people = legacyWorld.people.map((person) => ({
    id: stableId("person", {
      legacy_id: person.id,
      world_ref: legacyWorld.world_ref,
    }),
    kind: person.kind,
    attributes: {
      display_name: person.display_name,
      department: person.department,
      role: person.role,
      subject_ref: stableId("subject", {
        legacy_id: person.subject_id,
        world_ref: legacyWorld.world_ref,
      }),
      legacy_id: person.id,
    },
  }));
  const personIdByLegacyId = new Map(
    legacyWorld.people.map((person, index) => [person.id, people[index].id]),
  );
  const relationships = legacyWorld.people.map((person) => ({
    id: stableId("relationship", {
      legacy_id: person.id,
      organization_id: organizationId,
    }),
    kind: person.kind === "employee" ? "employment" : "customer",
    attributes: {
      from_entity_id: personIdByLegacyId.get(person.id),
      to_entity_id: organizationId,
      legacy_role: person.role,
    },
  }));
  const observations = legacyWorld.pii_lineage.records.map((record) => ({
    id: stableId("observation", {
      legacy_id: record.record_id,
      world_ref: legacyWorld.world_ref,
    }),
    kind: "pii-lineage",
    attributes: {
      source_record_ref: record.record_id,
      subject_ref: stableId("subject", {
        legacy_id: record.data_subject_id,
        world_ref: legacyWorld.world_ref,
      }),
      system_ref: systemIdByLegacyId.get(record.system_id),
      role_context: record.role_context,
      system_surface: record.system_surface,
      fields: structuredClone(record.fields),
      access_role_ids: structuredClone(record.access_role_ids),
      retention_state: record.retention_state,
      copied_from: record.copied_from ?? null,
      transformed_by: record.transformed_by ?? null,
      simulation_tick: record.created_at_simulation_tick,
      provenance_tier: "synthetic",
    },
  }));
  const scheduledEvents = legacyWorld.workflows
    .flatMap((workflow) =>
      workflow.steps.map((step) => ({
        tick: step.simulation_tick,
        priority: step.sequence,
        module_id: "core",
        event_type: "legacy.workflow.step",
        entity_id: personIdByLegacyId.get(step.actor_id) ?? null,
        payload: {
          workflow_ref: stableId("workflow", {
            legacy_id: workflow.id,
            world_ref: legacyWorld.world_ref,
          }),
          action: step.action,
          system_ref: systemIdByLegacyId.get(step.system_id),
          status: workflow.status,
          cross_system: workflow.cross_system,
        },
      })),
    )
    .sort((left, right) => left.tick - right.tick || left.priority - right.priority);

  return {
    contract_version: CONTRACTS.scenario,
    scenario_id: scenarioId,
    title: "Migrated deterministic enterprise fixture",
    description: "Deterministic compatibility migration from the public v0.1 fixture.",
    seed: legacyWorld.seed,
    clock: {
      start_tick: 0,
      end_tick: legacyWorld.simulation_tick,
      tick_duration_ms: 900000,
    },
    provenance: {
      origin: "scenario-specification",
      tier: "synthetic",
      authoritative: false,
      external_credentials_used: false,
    },
    research_status: "experimental",
    limitations: [
      "Compatibility migration preserves synthetic facts, not prior identifier values.",
      "No legal, regulatory, audit, or compliance conclusion is produced.",
    ],
    modules: [],
    initial_state: {
      people,
      households: [],
      organizations: [
        {
          id: organizationId,
          kind: "enterprise",
          attributes: {
            display_name: legacyWorld.company.name,
            fictional: true,
            operating_model: legacyWorld.company.operating_model,
            legacy_id: legacyWorld.company.id,
          },
        },
      ],
      institutions: [],
      systems,
      assets: [],
      relationships,
      contracts: [],
      accounts: [],
      resources: [],
      balances: [],
      metrics: [],
      observations,
    },
    scheduled_events: scheduledEvents,
  };
}

export function migrateLegacyWorld(legacyWorld) {
  const scenario = legacyWorldToScenario(legacyWorld);
  const kernel = new SimulationKernel();
  const exported = kernel.run(scenario);
  return {
    migration_version: "aether-world-v0.1-to-v1.v1",
    source_contract_version: legacyWorld.contract_version,
    target_contract_version: exported.world.contract_version,
    scenario,
    export: exported,
  };
}
