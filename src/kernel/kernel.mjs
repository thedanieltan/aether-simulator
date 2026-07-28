import { canonicalCompactJson } from "../canonical-json.mjs";
import { CONTRACTS, ENTITY_COLLECTIONS } from "./contracts.mjs";
import { compareEvents, normalizeEventIntents } from "./events.mjs";
import { createRandomSubstream, sha256, stableId } from "./ids.mjs";
import { appendEvent, applyCoreProjection } from "./projection.mjs";
import {
  assertContract,
  validateScenarioSemantics,
} from "./validation.mjs";

function sortById(values) {
  return structuredClone(values).sort((left, right) => left.id.localeCompare(right.id));
}

function withoutDigest(value) {
  const copy = structuredClone(value);
  delete copy.digest;
  return copy;
}

export function assertCheckpointIntegrity(checkpoint) {
  assertContract("checkpoint", checkpoint);
  if (checkpoint.digest !== sha256(withoutDigest(checkpoint))) {
    throw new TypeError("checkpoint digest mismatch");
  }
  return checkpoint;
}

export function assertExportIntegrity(exported) {
  assertContract("export", exported);
  if (exported.digest !== sha256(withoutDigest(exported))) {
    throw new TypeError("export digest mismatch");
  }
  return exported;
}

function moduleConfig(scenario, moduleId) {
  return scenario.modules.find((entry) => entry.module_id === moduleId)?.config ?? {};
}

export class SimulationKernel {
  constructor({ modules = [] } = {}) {
    const ids = modules.map((module) => module.moduleId);
    if (new Set(ids).size !== ids.length) {
      throw new TypeError("registered module ids must be unique");
    }
    this.modules = [...modules].sort((left, right) =>
      left.moduleId.localeCompare(right.moduleId),
    );
    this.moduleById = new Map(this.modules.map((module) => [module.moduleId, module]));
  }

  validateScenario(scenario) {
    return validateScenarioSemantics(scenario, this.modules.map((module) => module.moduleId));
  }

  run(scenario, { untilTick = scenario?.clock?.end_tick } = {}) {
    const execution = this.#createExecution(scenario);
    this.#drain(execution, untilTick);
    return this.#export(execution.world, execution.scenarioDigest);
  }

  checkpoint(scenario, tick) {
    const execution = this.#createExecution(scenario);
    this.#drain(execution, tick);
    const body = {
      contract_version: CONTRACTS.checkpoint,
      checkpoint_id: stableId("checkpoint", {
        scenario_digest: execution.scenarioDigest,
        branch_id: execution.world.branch.branch_id,
        tick,
        event_count: execution.world.event_log.length,
      }),
      scenario_digest: execution.scenarioDigest,
      tick,
      world: structuredClone(execution.world),
      pending_events: structuredClone(execution.queue).sort(compareEvents),
    };
    const checkpoint = { ...body, digest: sha256(body) };
    assertContract("checkpoint", checkpoint);
    return checkpoint;
  }

  resume(scenario, checkpoint, { untilTick = scenario?.clock?.end_tick } = {}) {
    const execution = this.#executionFromCheckpoint(scenario, checkpoint);
    this.#drain(execution, untilTick);
    return this.#export(execution.world, execution.scenarioDigest);
  }

  replay(scenario, eventLog, { untilTick = scenario?.clock?.end_tick } = {}) {
    const execution = this.#createExecution(scenario, { schedule: false });
    const events = structuredClone(eventLog);
    const sorted = [...events].sort(compareEvents);
    if (canonicalCompactJson(events) !== canonicalCompactJson(sorted)) {
      throw new TypeError("event log is not in canonical scheduler order");
    }
    for (const event of events) {
      if (event.tick > untilTick) {
        throw new TypeError("event log contains an event after the replay boundary");
      }
      this.#applyEvent(execution, event, { allowScheduling: false });
    }
    execution.world.clock.current_tick = untilTick;
    assertContract("world", execution.world);
    return this.#export(execution.world, execution.scenarioDigest);
  }

  branch(
    scenario,
    checkpoint,
    interventions,
    { untilTick = scenario?.clock?.end_tick } = {},
  ) {
    const execution = this.#executionFromCheckpoint(scenario, checkpoint);
    const interventionDigest = sha256(interventions);
    const branchId = stableId("branch", {
      parent_checkpoint_id: checkpoint.checkpoint_id,
      intervention_digest: interventionDigest,
    });
    execution.world.branch = {
      branch_id: branchId,
      parent_checkpoint_id: checkpoint.checkpoint_id,
      intervention_digest: interventionDigest,
    };
    const events = normalizeEventIntents({
      intents: interventions,
      scenarioId: scenario.scenario_id,
      branchId,
      origin: "intervention",
      emissionSource: `branch:${checkpoint.checkpoint_id}`,
    });
    for (const event of events) this.#assertSchedulable(execution, event, checkpoint.tick);
    execution.queue.push(...events);
    execution.queue.sort(compareEvents);
    this.#drain(execution, untilTick);
    return this.#export(execution.world, execution.scenarioDigest);
  }

  #activeModules(scenario) {
    const requested = new Set(
      scenario.modules
        .map((entry) => entry.module_id)
        .filter((moduleId) => moduleId !== "core"),
    );
    return this.modules.filter((module) => requested.has(module.moduleId));
  }

  #context({ module, scenario, world }) {
    return Object.freeze({
      moduleId: module.moduleId,
      moduleVersion: module.version,
      config: structuredClone(moduleConfig(scenario, module.moduleId)),
      scenario: structuredClone(scenario),
      world: structuredClone(world),
      stableId,
      random: ({ entityId = "world", purpose }) =>
        createRandomSubstream({
          rootSeed: scenario.seed,
          moduleId: module.moduleId,
          entityId,
          purpose,
        }),
    });
  }

  #createWorld(scenario, scenarioDigest, activeModules) {
    const entities = Object.fromEntries(
      ENTITY_COLLECTIONS.map((collection) => [
        collection,
        sortById(scenario.initial_state[collection]),
      ]),
    );
    const rootBranchId = stableId("branch", {
      scenario_digest: scenarioDigest,
      kind: "root",
    });
    const world = {
      contract_version: CONTRACTS.world,
      scenario_contract_version: CONTRACTS.scenario,
      world_id: stableId("world", {
        scenario_digest: scenarioDigest,
        seed: String(scenario.seed),
      }),
      scenario_id: scenario.scenario_id,
      seed: scenario.seed,
      clock: {
        start_tick: scenario.clock.start_tick,
        current_tick: scenario.clock.start_tick,
        end_tick: scenario.clock.end_tick,
        tick_duration_ms: scenario.clock.tick_duration_ms,
      },
      provenance: {
        origin: "deterministic-kernel",
        tier: "synthetic",
        authoritative: false,
        external_credentials_used: false,
        scenario_digest: scenarioDigest,
      },
      entities,
      relationships: sortById(scenario.initial_state.relationships),
      contracts: sortById(scenario.initial_state.contracts),
      accounts: sortById(scenario.initial_state.accounts),
      resources: sortById(scenario.initial_state.resources),
      balances: sortById(scenario.initial_state.balances),
      event_log: [],
      projected_state: {
        event_count: 0,
        last_event_id: null,
        module_state: {},
      },
      metrics: sortById(scenario.initial_state.metrics),
      observations: sortById(scenario.initial_state.observations),
      limitations: [...scenario.limitations].sort(),
      research_status: scenario.research_status,
      module_versions: Object.fromEntries([
        ["core", "1.0.0"],
        ...activeModules.map((module) => [module.moduleId, module.version]),
      ]),
      branch: {
        branch_id: rootBranchId,
        parent_checkpoint_id: null,
        intervention_digest: null,
      },
    };
    return world;
  }

  #createExecution(scenario, { schedule = true } = {}) {
    this.validateScenario(scenario);
    const scenarioDigest = sha256(scenario);
    const activeModules = this.#activeModules(scenario);
    const world = this.#createWorld(scenario, scenarioDigest, activeModules);

    for (const module of activeModules) {
      const state = module.initialize(
        this.#context({ module, scenario, world }),
      );
      world.projected_state.module_state[module.moduleId] =
        structuredClone(state ?? {});
    }

    const queue = [];
    if (schedule) {
      queue.push(
        ...normalizeEventIntents({
          intents: scenario.scheduled_events,
          scenarioId: scenario.scenario_id,
          branchId: world.branch.branch_id,
          origin: "scenario",
          emissionSource: "scenario",
        }),
      );
      for (const module of activeModules) {
        const intents =
          module.schedule(this.#context({ module, scenario, world })) ?? [];
        queue.push(
          ...normalizeEventIntents({
            intents,
            scenarioId: scenario.scenario_id,
            branchId: world.branch.branch_id,
            origin: "module",
            emissionSource: `module:${module.moduleId}`,
          }),
        );
      }
    }
    queue.sort(compareEvents);
    const execution = { scenario, scenarioDigest, activeModules, world, queue };
    for (const event of queue) {
      this.#assertSchedulable(execution, event, scenario.clock.start_tick);
    }
    assertContract("world", world);
    return execution;
  }

  #executionFromCheckpoint(scenario, checkpoint) {
    this.validateScenario(scenario);
    assertCheckpointIntegrity(checkpoint);
    const scenarioDigest = sha256(scenario);
    if (checkpoint.scenario_digest !== scenarioDigest) {
      throw new TypeError("checkpoint belongs to a different scenario");
    }
    const activeModules = this.#activeModules(scenario);
    const execution = {
      scenario,
      scenarioDigest,
      activeModules,
      world: structuredClone(checkpoint.world),
      queue: structuredClone(checkpoint.pending_events).sort(compareEvents),
    };
    return execution;
  }

  #assertSchedulable(execution, event, minimumTick) {
    assertContract("event", event);
    if (event.tick < minimumTick) {
      throw new TypeError(`event ${event.event_id} schedules into the past`);
    }
    if (event.tick > execution.scenario.clock.end_tick) {
      throw new TypeError(`event ${event.event_id} exceeds the scenario end tick`);
    }
  }

  #applyEvent(execution, event, { allowScheduling }) {
    assertContract("event", event);
    appendEvent(execution.world, event);
    applyCoreProjection(execution.world, event);

    for (const module of execution.activeModules) {
      const prior =
        execution.world.projected_state.module_state[module.moduleId] ?? {};
      const next = module.reduce(
        structuredClone(prior),
        structuredClone(event),
        this.#context({
          module,
          scenario: execution.scenario,
          world: execution.world,
        }),
      );
      execution.world.projected_state.module_state[module.moduleId] =
        structuredClone(next ?? prior);

      if (!allowScheduling) continue;
      const intents =
        module.afterEvent(
          structuredClone(event),
          this.#context({
            module,
            scenario: execution.scenario,
            world: execution.world,
          }),
        ) ?? [];
      const emitted = normalizeEventIntents({
        intents,
        scenarioId: execution.scenario.scenario_id,
        branchId: execution.world.branch.branch_id,
        origin: "module",
        emissionSource: `after:${event.event_id}:${module.moduleId}`,
      });
      for (const candidate of emitted) {
        this.#assertSchedulable(execution, candidate, event.tick);
      }
      execution.queue.push(...emitted);
    }
    execution.queue.sort(compareEvents);
  }

  #drain(execution, untilTick) {
    if (
      !Number.isSafeInteger(untilTick) ||
      untilTick < execution.world.clock.current_tick ||
      untilTick > execution.scenario.clock.end_tick
    ) {
      throw new TypeError("run boundary must be a valid tick within the scenario clock");
    }
    while (execution.queue.length > 0 && execution.queue[0].tick <= untilTick) {
      const event = execution.queue.shift();
      this.#applyEvent(execution, event, { allowScheduling: true });
    }
    execution.world.clock.current_tick = untilTick;
    assertContract("world", execution.world);
  }

  #export(world, scenarioDigest) {
    const body = {
      contract_version: CONTRACTS.export,
      export_id: stableId("export", {
        world_id: world.world_id,
        branch_id: world.branch.branch_id,
        current_tick: world.clock.current_tick,
        event_digest: sha256(world.event_log),
      }),
      scenario_digest: scenarioDigest,
      world: structuredClone(world),
    };
    const exported = { ...body, digest: sha256(body) };
    assertContract("export", exported);
    return exported;
  }
}

export function compareRuns(left, right) {
  assertExportIntegrity(left);
  assertExportIntegrity(right);
  let sharedEventCount = 0;
  const maximumShared = Math.min(
    left.world.event_log.length,
    right.world.event_log.length,
  );
  while (
    sharedEventCount < maximumShared &&
    canonicalCompactJson(left.world.event_log[sharedEventCount]) ===
      canonicalCompactJson(right.world.event_log[sharedEventCount])
  ) {
    sharedEventCount += 1;
  }

  const collectionCounts = (world) => ({
    ...Object.fromEntries(
      Object.entries(world.entities).map(([name, values]) => [name, values.length]),
    ),
    relationships: world.relationships.length,
    contracts: world.contracts.length,
    accounts: world.accounts.length,
    resources: world.resources.length,
    balances: world.balances.length,
    metrics: world.metrics.length,
    observations: world.observations.length,
  });

  const leftBalances = new Map(
    left.world.balances.map((balance) => [balance.id, balance.amount]),
  );
  const rightBalances = new Map(
    right.world.balances.map((balance) => [balance.id, balance.amount]),
  );
  const balanceIds = [...new Set([...leftBalances.keys(), ...rightBalances.keys()])].sort();
  const balanceDifferences = balanceIds
    .map((id) => ({
      balance_id: id,
      left: leftBalances.get(id) ?? null,
      right: rightBalances.get(id) ?? null,
      difference:
        (rightBalances.get(id) ?? 0) - (leftBalances.get(id) ?? 0),
    }))
    .filter((entry) => entry.left !== entry.right);

  return {
    contract_version: CONTRACTS.comparison,
    left_export_id: left.export_id,
    right_export_id: right.export_id,
    shared_event_count: sharedEventCount,
    left_event_count: left.world.event_log.length,
    right_event_count: right.world.event_log.length,
    collection_counts: {
      left: collectionCounts(left.world),
      right: collectionCounts(right.world),
    },
    balance_differences: balanceDifferences,
    semantically_equal: left.digest === right.digest,
  };
}
