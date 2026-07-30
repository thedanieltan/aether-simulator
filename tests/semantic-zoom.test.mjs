import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildEconomyScenario,
  buildEcosystemScenario,
  economyOperationsModule,
  ecosystemOperationsModule,
  enterpriseOperationsModule,
  SimulationKernel,
} from "../src/index.mjs";
import {
  buildSemanticZoomModel,
  resolveSemanticZoom,
} from "../src/entities/semantic-zoom.mjs";

async function fixture(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("economy semantic zoom provides deterministic world-enterprise-citizen paths", async () => {
  const config = await fixture("../scenarios/economy/stable-baseline.json");
  const scenario = buildEconomyScenario(config);
  const world = new SimulationKernel({
    modules: [economyOperationsModule],
  }).run(scenario).world;
  const first = buildSemanticZoomModel(world);
  const second = buildSemanticZoomModel(world);
  assert.deepEqual(first, second);
  assert.ok(first.enterprises.length > 0);
  assert.equal(first.world.citizen_count, config.scale);
  assert.equal(first.world.connected_citizen_count, config.scale);
  assert.ok(first.paths.length >= config.scale);

  const path = first.paths[0];
  const selected = resolveSemanticZoom(first, {
    enterpriseId: path.enterprise_id,
    citizenId: path.citizen_id,
  });
  assert.equal(selected.level, "citizen");
  assert.ok(
    selected.citizen.contexts.some(
      ({ counterpart_id: counterpartId }) =>
        counterpartId === selected.enterprise.enterprise_id,
    ),
  );
});

test("shared ecosystem citizens remain one entity across enterprise contexts", async () => {
  const config = await fixture("../scenarios/ecosystem/retail-supply-network.json");
  const scenario = buildEcosystemScenario(config);
  const world = new SimulationKernel({
    modules: [enterpriseOperationsModule, ecosystemOperationsModule],
  }).run(scenario).world;
  const model = buildSemanticZoomModel(world);
  const citizenIds = new Set(model.paths.map(({ citizen_id: citizenId }) => citizenId));
  assert.equal(citizenIds.size, 1);
  assert.ok(model.paths.length > 1);
  assert.throws(
    () => resolveSemanticZoom(model, {
      enterpriseId: "organization_missing",
    }),
    /not in this world/,
  );
});

