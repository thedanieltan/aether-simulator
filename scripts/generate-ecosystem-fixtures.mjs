import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEcosystemIntervention,
  buildEcosystemScenario,
  canonicalJson,
  compareEcosystemRuns,
  ecosystemOperationsModule,
  ecosystemScenarioMetadata,
  enterpriseOperationsModule,
  SimulationKernel,
  summarizeEcosystemRun,
} from "../src/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenarioDirectory = resolve(root, "scenarios", "ecosystem");
const fixtureDirectory = resolve(root, "fixtures", "ecosystem");
const names = (await readdir(scenarioDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const fullFixtureNames = new Set([
  "retail-supply-network.json",
  "saas-service-network.json",
  "vendor-outage-cascade.json",
]);
const kernel = new SimulationKernel({
  modules: [enterpriseOperationsModule, ecosystemOperationsModule],
});

await mkdir(fixtureDirectory, { recursive: true });
const summary = [];
for (const name of names) {
  const config = JSON.parse(
    await readFile(resolve(scenarioDirectory, name), "utf8"),
  );
  const exported = kernel.run(buildEcosystemScenario(config));
  summary.push(summarizeEcosystemRun(config, exported));
  if (fullFixtureNames.has(name)) {
    await writeFile(
      resolve(fixtureDirectory, name.replace(".json", ".export.json")),
      canonicalJson(exported),
      "utf8",
    );
  }
}

const interventionConfig = JSON.parse(
  await readFile(
    resolve(scenarioDirectory, "ecosystem-intervention-baseline.json"),
    "utf8",
  ),
);
const interventionScenario = buildEcosystemScenario(interventionConfig);
const metadata = ecosystemScenarioMetadata(interventionConfig);
const checkpoint = kernel.checkpoint(
  interventionScenario,
  metadata.next_tick - 1,
);
const baseline = kernel.run(interventionScenario);
const interventions = buildEcosystemIntervention(interventionConfig);
const branch = kernel.branch(interventionScenario, checkpoint, interventions);
const comparison = compareEcosystemRuns(baseline, branch, {
  kind: "capacity-restoration",
});

await writeFile(
  resolve(
    root,
    "scenarios",
    "interventions",
    "ecosystem-capacity-restoration.json",
  ),
  canonicalJson({ interventions }),
  "utf8",
);
for (const [name, value] of Object.entries({
  "acceptance-summary.json": summary,
  "ecosystem-intervention.checkpoint.json": checkpoint,
  "ecosystem-intervention.branch.json": branch,
  "ecosystem-intervention.comparison.json": comparison,
})) {
  await writeFile(resolve(fixtureDirectory, name), canonicalJson(value), "utf8");
}

process.stdout.write(
  canonicalJson({
    scenarios: names.length,
    full_exports: fullFixtureNames.size,
    lifecycle_artifacts: 3,
    fixture_directory: "fixtures/ecosystem",
  }),
);
