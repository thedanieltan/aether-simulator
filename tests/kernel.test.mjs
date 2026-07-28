import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  baselineOperationsModule,
  canonicalJson,
  compareRuns,
  createRandomSubstream,
  defineModule,
  migrateLegacyWorld,
  normalizeEventIntents,
  SimulationKernel,
  stableId,
} from "../src/index.mjs";

const baselineScenario = JSON.parse(
  await readFile(new URL("../scenarios/kernel-baseline.json", import.meta.url), "utf8"),
);

function scenarioCopy() {
  return structuredClone(baselineScenario);
}

function kernel() {
  return new SimulationKernel({ modules: [baselineOperationsModule] });
}

test("same scenario, version, and seed produce byte-identical artifacts", () => {
  const first = kernel().run(scenarioCopy());
  const second = kernel().run(scenarioCopy());
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(
    canonicalJson(first.world.event_log),
    canonicalJson(second.world.event_log),
  );
  assert.equal(
    canonicalJson(first.world.projected_state),
    canonicalJson(second.world.projected_state),
  );
  assert.equal(
    canonicalJson(kernel().checkpoint(scenarioCopy(), 2)),
    canonicalJson(kernel().checkpoint(scenarioCopy(), 2)),
  );
});

test("different seeds produce different worlds and substream outcomes", () => {
  const firstScenario = scenarioCopy();
  const secondScenario = scenarioCopy();
  secondScenario.seed = 424243;
  const first = kernel().run(firstScenario);
  const second = kernel().run(secondScenario);
  assert.notEqual(first.world.world_id, second.world.world_id);
  assert.notEqual(first.digest, second.digest);
  assert.notEqual(first.world.balances[0].amount, second.world.balances[0].amount);
});

test("module registration order does not change semantic output", () => {
  function module(moduleId) {
    return defineModule({
      moduleId,
      version: "1.0.0",
      schedule({ config }) {
        return [
          {
            tick: 5,
            priority: 0,
            module_id: moduleId,
            event_type: `${moduleId}.observed`,
            entity_id: config.entity_id,
            payload: { value: moduleId },
          },
        ];
      },
      reduce(state, event) {
        return {
          event_ids: [...(state.event_ids ?? []), event.event_id].sort(),
        };
      },
    });
  }
  const alpha = module("alpha");
  const omega = module("omega");
  const scenario = scenarioCopy();
  scenario.modules.push(
    {
      module_id: "omega",
      config: { entity_id: scenario.initial_state.organizations[0].id },
    },
    {
      module_id: "alpha",
      config: { entity_id: scenario.initial_state.organizations[0].id },
    },
  );
  const left = new SimulationKernel({
    modules: [omega, baselineOperationsModule, alpha],
  }).run(scenario);
  const right = new SimulationKernel({
    modules: [alpha, baselineOperationsModule, omega],
  }).run(scenario);
  assert.equal(canonicalJson(left), canonicalJson(right));
});

test("same-tick ordering depends on canonical semantics, not insertion order", () => {
  const common = {
    scenarioId: "ordering-test",
    branchId: stableId("branch", "ordering-test"),
    origin: "scenario",
    emissionSource: "scenario",
  };
  const first = {
    tick: 1,
    module_id: "core",
    event_type: "core.observation.recorded",
    payload: { alpha: 1, omega: 2 },
  };
  const second = {
    tick: 1,
    module_id: "core",
    event_type: "core.observation.recorded",
    payload: { beta: 1 },
  };
  const forward = normalizeEventIntents({ ...common, intents: [first, second] });
  const reverse = normalizeEventIntents({
    ...common,
    intents: [second, { ...first, payload: { omega: 2, alpha: 1 } }],
  });
  assert.equal(canonicalJson(forward), canonicalJson(reverse));
});

test("replay from initial state equals the original run", () => {
  const scenario = scenarioCopy();
  const original = kernel().run(scenario);
  const replayed = kernel().replay(scenario, original.world.event_log);
  assert.equal(canonicalJson(replayed), canonicalJson(original));
});

test("resume from checkpoint equals uninterrupted execution", () => {
  const scenario = scenarioCopy();
  const uninterrupted = kernel().run(scenario);
  const checkpoint = kernel().checkpoint(scenario, 2);
  const resumed = kernel().resume(scenario, checkpoint);
  assert.equal(canonicalJson(resumed), canonicalJson(uninterrupted));
});

test("branch preserves shared history and isolates intervention effects", () => {
  const scenario = scenarioCopy();
  const checkpoint = kernel().checkpoint(scenario, 2);
  const intervention = [
    {
      tick: 4,
      module_id: "core",
      event_type: "core.balance.adjusted",
      entity_id: scenario.initial_state.organizations[0].id,
      payload: {
        balance_id: scenario.initial_state.balances[0].id,
        delta: 75,
      },
    },
  ];
  const original = kernel().run(scenario);
  const branched = kernel().branch(scenario, checkpoint, intervention);
  assert.deepEqual(
    branched.world.event_log.slice(0, checkpoint.world.event_log.length),
    checkpoint.world.event_log,
  );
  assert.equal(
    branched.world.balances[0].amount,
    original.world.balances[0].amount + 75,
  );
  const comparison = compareRuns(original, branched);
  assert.equal(comparison.shared_event_count, original.world.event_log.length);
  assert.equal(comparison.semantically_equal, false);
});

test("invalid scenarios, versions, and checkpoint tampering fail closed", () => {
  const invalidClock = scenarioCopy();
  invalidClock.clock.end_tick = -1;
  assert.throws(() => kernel().run(invalidClock), /invalid scenario/);

  const unsupported = scenarioCopy();
  unsupported.contract_version = "aether-scenario.v2";
  assert.throws(() => kernel().run(unsupported), /invalid scenario contract/);

  const scenario = scenarioCopy();
  const checkpoint = kernel().checkpoint(scenario, 2);
  checkpoint.world.clock.current_tick = 1;
  assert.throws(() => kernel().resume(scenario, checkpoint), /digest mismatch/);

  const exported = kernel().run(scenario);
  const altered = structuredClone(exported);
  altered.world.clock.current_tick = 1;
  assert.throws(() => compareRuns(exported, altered), /digest mismatch/);
});

test("cryptographic stable identifiers do not collide in a substantial corpus", () => {
  const ids = new Set();
  for (let index = 0; index < 50000; index += 1) {
    ids.add(stableId("entity", { scenario: "collision-corpus", index }));
  }
  assert.equal(ids.size, 50000);
});

test("random substreams are reproducible and namespace-isolated", () => {
  const specification = {
    rootSeed: "root-seed",
    moduleId: "module-a",
    entityId: "entity-a",
    purpose: "choice",
  };
  const first = createRandomSubstream(specification);
  const second = createRandomSubstream(specification);
  assert.deepEqual(
    [first.next(), first.next(), first.next()],
    [second.next(), second.next(), second.next()],
  );
  const isolated = createRandomSubstream({ ...specification, purpose: "other-choice" });
  assert.notEqual(
    createRandomSubstream(specification).next(),
    isolated.next(),
  );
});

test("legacy public fixture migrates deterministically to the v1 kernel", async () => {
  const legacy = JSON.parse(
    await readFile(
      new URL("../fixtures/world.seed-424242.json", import.meta.url),
      "utf8",
    ),
  );
  const first = migrateLegacyWorld(legacy);
  const second = migrateLegacyWorld(legacy);
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(first.source_contract_version, "aether-world.v0.1");
  assert.equal(first.target_contract_version, "aether-world.v1");
  assert.ok(first.export.world.event_log.length > 0);
  assert.ok(
    first.export.world.observations.some(
      (observation) => observation.kind === "pii-lineage",
    ),
  );
});
