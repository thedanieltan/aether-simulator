import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEnterpriseScenario,
  canonicalJson,
  compareEnterpriseRuns,
  enterpriseOperationsModule,
  SimulationKernel,
  summarizeEnterpriseRun,
} from "../src/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenarioDirectory = resolve(root, "scenarios", "enterprise");
const fixtureDirectory = resolve(root, "fixtures", "enterprise");
const names = (await readdir(scenarioDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const simulationKernel = new SimulationKernel({
  modules: [enterpriseOperationsModule],
});
const fullFixtureNames = new Set([
  "professional-services-customer-engagement.json",
  "retail-order-to-cash.json",
  "saas-customer-lifecycle.json",
]);

await mkdir(fixtureDirectory, { recursive: true });
const summary = [];
for (const name of names) {
  const config = JSON.parse(
    await readFile(resolve(scenarioDirectory, name), "utf8"),
  );
  const scenario = buildEnterpriseScenario(config);
  const exported = simulationKernel.run(scenario);
  summary.push(summarizeEnterpriseRun(config, exported));
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
    resolve(scenarioDirectory, "retail-intervention-baseline.json"),
    "utf8",
  ),
);
const interventionScenario = buildEnterpriseScenario(interventionConfig);
const checkpoint = simulationKernel.checkpoint(interventionScenario, 10);
const original = simulationKernel.run(interventionScenario);
const intervention = JSON.parse(
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
const branch = simulationKernel.branch(
  interventionScenario,
  checkpoint,
  intervention.interventions,
);
const comparison = compareEnterpriseRuns(original, branch);

const artifacts = {
  "acceptance-summary.json": summary,
  "retail-intervention.checkpoint.json": checkpoint,
  "retail-intervention.branch.json": branch,
  "retail-intervention.comparison.json": comparison,
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
    scenarios: summary.length,
    full_exports: fullFixtureNames.size,
    lifecycle_artifacts: Object.keys(artifacts).length,
    fixture_directory: "fixtures/enterprise",
  }),
);
