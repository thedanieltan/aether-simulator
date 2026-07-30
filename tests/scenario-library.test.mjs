import assert from "node:assert/strict";
import test from "node:test";
import {
  filterScenarioLibrary,
  guidedFirstRun,
  scenarioCatalogFromLibrary,
  scenarioLibrary,
} from "../src/index.mjs";

test("scenario library covers every committed browser scenario exactly once", () => {
  const catalog = scenarioCatalogFromLibrary(scenarioLibrary);
  assert.equal(scenarioLibrary.entries.length, 16);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(catalog).map(([depth, entries]) => [depth, entries.length]),
    ),
    { enterprise: 5, ecosystem: 5, economy: 6 },
  );
  assert.equal(
    new Set(
      scenarioLibrary.entries.map(({ depth, scenario_id: scenarioId }) =>
        `${depth}/${scenarioId}`),
    ).size,
    scenarioLibrary.entries.length,
  );
  assert.equal(scenarioLibrary.entries.every(({ synthetic }) => synthetic), true);
});

test("library filtering and the guided first run resolve to committed scenarios", () => {
  assert.deepEqual(
    filterScenarioLibrary({ depth: "economy", query: "credit" })
      .map(({ scenario_id: scenarioId }) => scenarioId),
    ["credit-tightening-default"],
  );
  const guided = filterScenarioLibrary({
    depth: guidedFirstRun.depth,
    query: "retail",
  });
  assert.ok(guided.some(
    ({ scenario_id: scenarioId }) => scenarioId === guidedFirstRun.scenario,
  ));
  assert.equal(filterScenarioLibrary({ query: "not-a-scenario" }).length, 0);
});

