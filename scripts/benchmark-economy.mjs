import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  buildEconomyScenario,
  economyOperationsModule,
  SimulationKernel,
} from "../src/index.mjs";

const base = JSON.parse(
  await readFile(new URL("../scenarios/economy/stable-baseline.json", import.meta.url), "utf8"),
);
const profiles =
  process.argv.length > 2
    ? process.argv.slice(2).map(Number)
    : [1, 10, 25];
if (profiles.some((value) => !Number.isSafeInteger(value) || value < 1)) {
  throw new TypeError("benchmark profiles must be positive safe integers");
}
const kernel = new SimulationKernel({ modules: [economyOperationsModule] });
const results = [];
for (const scale of profiles) {
  const config = {
    ...base,
    scenario_id: `economy-benchmark-${scale}`,
    seed: `economy-benchmark-${scale}`,
    scale,
  };
  const startBuild = performance.now();
  const scenario = buildEconomyScenario(config, {
    partitionSize: Math.max(1, Math.floor(Math.sqrt(scale))),
  });
  const buildMs = performance.now() - startBuild;
  const startRun = performance.now();
  const exported = kernel.run(scenario);
  const runMs = performance.now() - startRun;
  results.push({
    scale,
    citizens: exported.world.entities.people.length,
    firms_and_nonprofits: exported.world.entities.organizations.length - scale,
    banks: scale,
    events: exported.world.event_log.length,
    build_ms: Number(buildMs.toFixed(3)),
    run_ms: Number(runMs.toFixed(3)),
  });
}
process.stdout.write(`${JSON.stringify({ node: process.version, results }, null, 2)}\n`);
