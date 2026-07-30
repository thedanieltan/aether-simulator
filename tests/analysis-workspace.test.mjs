import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeSyntheticWorld,
  buildEconomyScenario,
  economyOperationsModule,
  SimulationKernel,
} from "../src/index.mjs";

test("analysis describes one deterministic synthetic run without causal claims", async () => {
  const config = JSON.parse(
    await readFile(
      new URL("../scenarios/economy/stable-baseline.json", import.meta.url),
      "utf8",
    ),
  );
  const exported = new SimulationKernel({
    modules: [economyOperationsModule],
  }).run(buildEconomyScenario(config));
  const first = analyzeSyntheticWorld(exported);
  const second = analyzeSyntheticWorld(exported);
  assert.deepEqual(first, second);
  assert.equal(first.measures.events, exported.world.event_log.length);
  assert.equal(
    first.measures.entities,
    Object.values(exported.world.entities).flat().length,
  );
  assert.ok(first.cohorts.some(
    ({ collection, kind }) =>
      collection === "people" && kind === "synthetic-citizen",
  ));
  assert.equal(first.interpretation.statistical_uncertainty_estimated, false);
  assert.equal(first.interpretation.causal_effect_estimated, false);
  assert.equal(
    first.declared_event_ancestry.every(({ declared }) => declared),
    true,
  );
});

test("analysis rejects exports that do not preserve the synthetic boundary", () => {
  assert.throws(
    () => analyzeSyntheticWorld({
      world: {
        provenance: { tier: "provider", authoritative: true },
      },
    }),
    /synthetic non-authoritative/,
  );
});

