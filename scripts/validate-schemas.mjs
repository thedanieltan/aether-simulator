import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertContract,
  baselineOperationsModule,
  registeredSchemas,
  SimulationKernel,
} from "../src/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaDirectory = resolve(root, "schemas", "kernel");
const schemaNames = (await readdir(schemaDirectory))
  .filter((name) => name.endsWith(".schema.json"))
  .sort();

for (const name of schemaNames) {
  JSON.parse(await readFile(resolve(schemaDirectory, name), "utf8"));
}

const registered = registeredSchemas();
if (Object.keys(registered).length !== schemaNames.length) {
  throw new Error("registered schema set differs from the committed kernel schemas");
}

const scenario = JSON.parse(
  await readFile(resolve(root, "scenarios", "kernel-baseline.json"), "utf8"),
);
const kernel = new SimulationKernel({ modules: [baselineOperationsModule] });
kernel.validateScenario(scenario);
const exported = kernel.run(scenario);
const checkpoint = kernel.checkpoint(scenario, 2);
assertContract("world", exported.world);
assertContract("export", exported);
assertContract("checkpoint", checkpoint);
for (const event of exported.world.event_log) assertContract("event", event);

process.stdout.write(
  `Validated ${schemaNames.length} schemas and representative contracts.\n`,
);
