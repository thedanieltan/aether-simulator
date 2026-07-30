import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeWorldEvidence,
  validateWorldFixture,
} from "../packages/evidence-bridge/src/index.mjs";
import {
  baselineOperationsModule,
  buildEcosystemScenario,
  buildEnterpriseScenario,
  canonicalJson,
  compareEnterpriseRuns,
  compareEcosystemRuns,
  compareRuns,
  enterpriseOperationsModule,
  ecosystemOperationsModule,
  ecosystemScenarioMetadata,
  migrateLegacyWorld,
  SimulationKernel,
  summarizeEnterpriseRun,
  summarizeEcosystemRun,
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

const enterpriseScenarioDirectory = resolve(root, "scenarios", "enterprise");
const enterpriseFixtureDirectory = resolve(fixtureDirectory, "enterprise");
const enterpriseScenarioNames = (await readdir(enterpriseScenarioDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const fullEnterpriseFixtures = new Set([
  "professional-services-customer-engagement.json",
  "retail-order-to-cash.json",
  "saas-customer-lifecycle.json",
]);
const enterpriseKernel = new SimulationKernel({
  modules: [enterpriseOperationsModule],
});
const enterpriseSummary = [];
for (const name of enterpriseScenarioNames) {
  const config = JSON.parse(
    await readFile(resolve(enterpriseScenarioDirectory, name), "utf8"),
  );
  const scenario = buildEnterpriseScenario(config);
  const exported = enterpriseKernel.run(scenario);
  enterpriseSummary.push(summarizeEnterpriseRun(config, exported));
  if (fullEnterpriseFixtures.has(name)) {
    const committed = await readFile(
      resolve(
        enterpriseFixtureDirectory,
        name.replace(".json", ".export.json"),
      ),
      "utf8",
    );
    if (canonicalJson(exported) !== committed) {
      throw new Error(`${name} enterprise export fixture is not reproducible`);
    }
  }
}
const committedSummary = await readFile(
  resolve(enterpriseFixtureDirectory, "acceptance-summary.json"),
  "utf8",
);
if (canonicalJson(enterpriseSummary) !== committedSummary) {
  throw new Error("enterprise acceptance summary is not reproducible");
}

const branchConfig = JSON.parse(
  await readFile(
    resolve(enterpriseScenarioDirectory, "retail-intervention-baseline.json"),
    "utf8",
  ),
);
const branchScenario = buildEnterpriseScenario(branchConfig);
const enterpriseCheckpoint = enterpriseKernel.checkpoint(branchScenario, 10);
const enterpriseOriginal = enterpriseKernel.run(branchScenario);
const enterpriseIntervention = JSON.parse(
  await readFile(
    resolve(
      root,
      "scenarios",
      "interventions",
      "enterprise-inventory-buffer.json",
    ),
    "utf8",
  ),
);
const enterpriseBranch = enterpriseKernel.branch(
  branchScenario,
  enterpriseCheckpoint,
  enterpriseIntervention.interventions,
);
const enterpriseComparison = compareEnterpriseRuns(
  enterpriseOriginal,
  enterpriseBranch,
);
for (const [name, value] of Object.entries({
  "retail-intervention.checkpoint.json": enterpriseCheckpoint,
  "retail-intervention.branch.json": enterpriseBranch,
  "retail-intervention.comparison.json": enterpriseComparison,
})) {
  const committed = await readFile(resolve(enterpriseFixtureDirectory, name), "utf8");
  if (canonicalJson(value) !== committed) {
    throw new Error(`${name} is not reproducible`);
  }
}

process.stdout.write(
  `Validated ${enterpriseScenarioNames.length} enterprise scenarios, ${fullEnterpriseFixtures.size} full exports, and intervention lifecycle fixtures.\n`,
);

const ecosystemScenarioDirectory = resolve(root, "scenarios", "ecosystem");
const ecosystemFixtureDirectory = resolve(fixtureDirectory, "ecosystem");
const ecosystemScenarioNames = (await readdir(ecosystemScenarioDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const fullEcosystemFixtures = new Set([
  "retail-supply-network.json",
  "saas-service-network.json",
  "vendor-outage-cascade.json",
]);
const ecosystemKernel = new SimulationKernel({
  modules: [enterpriseOperationsModule, ecosystemOperationsModule],
});
const ecosystemSummary = [];
for (const name of ecosystemScenarioNames) {
  const config = JSON.parse(
    await readFile(resolve(ecosystemScenarioDirectory, name), "utf8"),
  );
  const ecosystemScenario = buildEcosystemScenario(config);
  const exported = ecosystemKernel.run(ecosystemScenario);
  ecosystemSummary.push(summarizeEcosystemRun(config, exported));
  if (fullEcosystemFixtures.has(name)) {
    const committed = await readFile(
      resolve(ecosystemFixtureDirectory, name.replace(".json", ".export.json")),
      "utf8",
    );
    if (canonicalJson(exported) !== committed) {
      throw new Error(`${name} ecosystem export fixture is not reproducible`);
    }
  }
}
const committedEcosystemSummary = await readFile(
  resolve(ecosystemFixtureDirectory, "acceptance-summary.json"),
  "utf8",
);
if (canonicalJson(ecosystemSummary) !== committedEcosystemSummary) {
  throw new Error("ecosystem acceptance summary is not reproducible");
}
const ecosystemBranchConfig = JSON.parse(
  await readFile(
    resolve(ecosystemScenarioDirectory, "ecosystem-intervention-baseline.json"),
    "utf8",
  ),
);
const ecosystemBranchScenario = buildEcosystemScenario(ecosystemBranchConfig);
const ecosystemMetadata = ecosystemScenarioMetadata(ecosystemBranchConfig);
const ecosystemCheckpoint = ecosystemKernel.checkpoint(
  ecosystemBranchScenario,
  ecosystemMetadata.next_tick - 1,
);
const ecosystemBaseline = ecosystemKernel.run(ecosystemBranchScenario);
const ecosystemIntervention = JSON.parse(
  await readFile(
    resolve(
      root,
      "scenarios",
      "interventions",
      "ecosystem-capacity-restoration.json",
    ),
    "utf8",
  ),
);
const ecosystemBranch = ecosystemKernel.branch(
  ecosystemBranchScenario,
  ecosystemCheckpoint,
  ecosystemIntervention.interventions,
);
const ecosystemComparison = compareEcosystemRuns(
  ecosystemBaseline,
  ecosystemBranch,
  { kind: "capacity-restoration" },
);
for (const [name, value] of Object.entries({
  "ecosystem-intervention.checkpoint.json": ecosystemCheckpoint,
  "ecosystem-intervention.branch.json": ecosystemBranch,
  "ecosystem-intervention.comparison.json": ecosystemComparison,
})) {
  const committed = await readFile(resolve(ecosystemFixtureDirectory, name), "utf8");
  if (canonicalJson(value) !== committed) {
    throw new Error(`${name} is not reproducible`);
  }
}
process.stdout.write(
  `Validated ${ecosystemScenarioNames.length} ecosystem scenarios, ${fullEcosystemFixtures.size} full exports, and intervention lifecycle fixtures.\n`,
);
