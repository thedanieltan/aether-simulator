import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEconomyIntervention,
  buildEconomyScenario,
  canonicalJson,
  compareEconomyRuns,
  economyOperationsModule,
  SimulationKernel,
  summarizeEconomyRun,
} from "../src/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scenarioDirectory = resolve(root, "scenarios", "economy");
const fixtureDirectory = resolve(root, "fixtures", "economy");
const names = (await readdir(scenarioDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();
const fullFixtureNames = new Set([
  "stable-baseline.json",
  "supply-chain-shock.json",
  "major-employer-failure.json",
]);
const kernel = new SimulationKernel({ modules: [economyOperationsModule] });

await mkdir(fixtureDirectory, { recursive: true });
const summary = [];
for (const name of names) {
  const config = JSON.parse(await readFile(resolve(scenarioDirectory, name), "utf8"));
  const exported = kernel.run(buildEconomyScenario(config));
  summary.push(summarizeEconomyRun(config, exported));
  if (fullFixtureNames.has(name)) {
    await writeFile(
      resolve(fixtureDirectory, name.replace(".json", ".export.json")),
      canonicalJson(exported),
      "utf8",
    );
  }
}

const config = JSON.parse(
  await readFile(resolve(scenarioDirectory, "policy-intervention-baseline.json"), "utf8"),
);
const scenario = buildEconomyScenario(config);
const checkpoint = kernel.checkpoint(scenario, 16);
const baseline = kernel.run(scenario);
const interventions = buildEconomyIntervention(config, { tick: 17, transfer: 12 });
const branch = kernel.branch(scenario, checkpoint, interventions);
const comparison = compareEconomyRuns(baseline, branch, {
  transfer: 12,
  mechanism: "declared household transfer",
});
await mkdir(resolve(root, "scenarios", "interventions"), { recursive: true });
await writeFile(
  resolve(root, "scenarios", "interventions", "economy-household-transfer.json"),
  canonicalJson({ interventions }),
  "utf8",
);
for (const [name, value] of Object.entries({
  "acceptance-summary.json": summary,
  "economy-intervention.checkpoint.json": checkpoint,
  "economy-intervention.branch.json": branch,
  "economy-intervention.comparison.json": comparison,
})) {
  await writeFile(resolve(fixtureDirectory, name), canonicalJson(value), "utf8");
}

process.stdout.write(
  canonicalJson({
    scenarios: names.length,
    full_exports: fullFixtureNames.size,
    lifecycle_artifacts: 3,
    fixture_directory: "fixtures/economy",
  }),
);
