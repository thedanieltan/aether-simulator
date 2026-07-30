import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  buildEcosystemScenario,
  ecosystemOperationsModule,
  enterpriseOperationsModule,
  SimulationKernel,
} from "../src/index.mjs";

const base = JSON.parse(
  await readFile(
    new URL("../scenarios/ecosystem/retail-supply-network.json", import.meta.url),
    "utf8",
  ),
);
const profiles =
  process.argv.length > 2
    ? process.argv.slice(2).map((value) => Number(value))
    : [1, 5, 10];
if (
  profiles.some(
    (value) => !Number.isSafeInteger(value) || value < 1,
  )
) {
  throw new TypeError("benchmark profiles must be positive safe integers");
}
const kernel = new SimulationKernel({
  modules: [enterpriseOperationsModule, ecosystemOperationsModule],
});
const results = [];
for (const scale of profiles) {
  const config = {
    ...base,
    scenario_id: `ecosystem-benchmark-${scale}`,
    scale,
    seed: `ecosystem-benchmark-${scale}`,
  };
  const buildStart = performance.now();
  const scenario = buildEcosystemScenario(config, {
    partitionSize: Math.max(1, Math.floor(Math.sqrt(scale))),
  });
  const buildMs = performance.now() - buildStart;
  const runStart = performance.now();
  const exported = kernel.run(scenario);
  const runMs = performance.now() - runStart;
  results.push({
    scale,
    organizations: exported.world.entities.organizations.length,
    citizens: exported.world.entities.people.length,
    events: exported.world.event_log.length,
    build_ms: Number(buildMs.toFixed(3)),
    run_ms: Number(runMs.toFixed(3)),
  });
}
process.stdout.write(`${JSON.stringify({ node: process.version, results }, null, 2)}\n`);
