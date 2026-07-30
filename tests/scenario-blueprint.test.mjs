import assert from "node:assert/strict";
import test from "node:test";
import {
  compileScenarioBlueprint,
  createScenarioBlueprint,
  serializeScenarioBlueprint,
  validateScenarioBlueprint,
} from "../src/scenarios/blueprint.mjs";

const catalog = {
  enterprise: [["retail-intervention-baseline", "Retail"]],
  ecosystem: [["vendor-outage-cascade", "Vendor outage"]],
  economy: [["stable-baseline", "Stable baseline"]],
};
const configuration = {
  depth: "enterprise",
  scenario: "retail-intervention-baseline",
  scale: 2,
  duration: 120,
  intervention: 16,
  seed: "blueprint-seed",
};

test("scenario blueprint compiles deterministically to an exact run configuration", () => {
  const blueprint = createScenarioBlueprint(configuration);
  assert.deepEqual(compileScenarioBlueprint(blueprint, catalog), configuration);
  assert.equal(
    serializeScenarioBlueprint(blueprint, catalog),
    serializeScenarioBlueprint(createScenarioBlueprint(configuration), catalog),
  );
  assert.deepEqual(
    blueprint.nodes.map(({ node_id: nodeId }) => nodeId),
    ["premise", "population", "time", "intervention", "reproducibility"],
  );
});

test("scenario blueprint rejects unsupported topology and scenario identifiers", () => {
  const blueprint = createScenarioBlueprint(configuration);
  const missingNode = structuredClone(blueprint);
  missingNode.nodes.pop();
  assert.equal(validateScenarioBlueprint(missingNode, catalog).valid, false);
  assert.throws(
    () => compileScenarioBlueprint(missingNode, catalog),
    /supported deterministic pipeline/,
  );

  const wrongScenario = createScenarioBlueprint({
    ...configuration,
    scenario: "not-committed",
  });
  assert.throws(
    () => compileScenarioBlueprint(wrongScenario, catalog),
    /not available/,
  );
});

test("scenario blueprint rejects unsafe numeric and text boundaries", () => {
  assert.throws(
    () => createScenarioBlueprint({ ...configuration, scale: 0 }),
    /scale/,
  );
  assert.throws(
    () => createScenarioBlueprint({ ...configuration, duration: 1_000_001 }),
    /duration/,
  );
  assert.throws(
    () => createScenarioBlueprint({ ...configuration, seed: "" }),
    /seed/,
  );
});
