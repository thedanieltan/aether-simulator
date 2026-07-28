import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeWorldEvidence } from "../packages/evidence-bridge/src/index.mjs";
import {
  baselineOperationsModule,
  canonicalJson,
  compareRuns,
  migrateLegacyWorld,
  SimulationKernel,
} from "../src/index.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenarioPath = resolve(
  repositoryRoot,
  process.argv[2] ?? "scenarios/kernel-baseline.json",
);
const scenario = JSON.parse(await readFile(scenarioPath, "utf8"));
const intervention = JSON.parse(
  await readFile(
    resolve(
      repositoryRoot,
      "scenarios/interventions/baseline-credit-adjustment.json",
    ),
    "utf8",
  ),
);
const legacyWorld = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "fixtures/world.seed-424242.json"),
    "utf8",
  ),
);
const kernel = new SimulationKernel({ modules: [baselineOperationsModule] });
const exported = kernel.run(scenario);
const checkpoint = kernel.checkpoint(scenario, 2);
const branch = kernel.branch(scenario, checkpoint, intervention.interventions);
const comparison = compareRuns(exported, branch);
const migration = migrateLegacyWorld(legacyWorld);
const evidence = normalizeWorldEvidence(exported);
const fixtureDirectory = resolve(repositoryRoot, "fixtures");

await mkdir(fixtureDirectory, { recursive: true });
const artifacts = {
  "kernel-baseline.export.json": exported,
  "kernel-baseline.checkpoint.json": checkpoint,
  "kernel-baseline.branch.json": branch,
  "kernel-baseline.comparison.json": comparison,
  "kernel-baseline.evidence.json": evidence,
  "legacy-world-v0.1.migration.json": migration,
};
for (const [name, value] of Object.entries(artifacts)) {
  await writeFile(
    resolve(fixtureDirectory, name),
    canonicalJson(value),
    "utf8",
  );
}

process.stdout.write(
  canonicalJson({
    seed: scenario.seed,
    scenario_id: scenario.scenario_id,
    world_id: exported.world.world_id,
    event_count: exported.world.event_log.length,
    entity_count: Object.values(exported.world.entities).flat().length,
    evidence_envelopes: evidence.envelopes.length,
    lifecycle_artifacts: Object.keys(artifacts).length,
    output_directory: "fixtures",
  }),
);
