import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeWorldEvidence,
  validateWorldFixture,
} from "../packages/evidence-bridge/src/index.mjs";
import {
  baselineOperationsModule,
  canonicalJson,
  compareRuns,
  migrateLegacyWorld,
  SimulationKernel,
} from "../src/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDirectory = resolve(root, "fixtures");
const fixtureNames = (await readdir(fixtureDirectory))
  .filter((name) => /^world\.seed-\d+\.json$/.test(name))
  .sort();

if (fixtureNames.length === 0) {
  throw new Error("no deterministic world fixtures found");
}

for (const name of fixtureNames) {
  const world = JSON.parse(await readFile(resolve(fixtureDirectory, name), "utf8"));
  const result = validateWorldFixture(world);
  if (!result.valid) {
    throw new Error(`${name}: ${result.errors.join("; ")}`);
  }
}

const scenario = JSON.parse(
  await readFile(resolve(root, "scenarios", "kernel-baseline.json"), "utf8"),
);
const kernel = new SimulationKernel({ modules: [baselineOperationsModule] });
const generated = kernel.run(scenario);
const committedExport = await readFile(
  resolve(fixtureDirectory, "kernel-baseline.export.json"),
  "utf8",
);
if (canonicalJson(generated) !== committedExport) {
  throw new Error("kernel-baseline.export.json is not reproducible");
}
const replayed = kernel.replay(scenario, generated.world.event_log);
if (canonicalJson(generated) !== canonicalJson(replayed)) {
  throw new Error("kernel baseline replay differs from the original run");
}

const checkpoint = kernel.checkpoint(scenario, 2);
const intervention = JSON.parse(
  await readFile(
    resolve(
      root,
      "scenarios",
      "interventions",
      "baseline-credit-adjustment.json",
    ),
    "utf8",
  ),
);
const branch = kernel.branch(scenario, checkpoint, intervention.interventions);
const comparison = compareRuns(generated, branch);

const legacyWorld = JSON.parse(
  await readFile(resolve(fixtureDirectory, "world.seed-424242.json"), "utf8"),
);
const migration = migrateLegacyWorld(legacyWorld);
const expectedArtifacts = {
  "kernel-baseline.checkpoint.json": checkpoint,
  "kernel-baseline.branch.json": branch,
  "kernel-baseline.comparison.json": comparison,
  "kernel-baseline.evidence.json": normalizeWorldEvidence(generated),
  "legacy-world-v0.1.migration.json": migration,
};
for (const [name, value] of Object.entries(expectedArtifacts)) {
  const committed = await readFile(resolve(fixtureDirectory, name), "utf8");
  if (canonicalJson(value) !== committed) {
    throw new Error(`${name} is not reproducible`);
  }
}

process.stdout.write(
  `Validated ${fixtureNames.length} legacy world fixture(s), kernel replay, lifecycle fixtures, and migration.\n`,
);
