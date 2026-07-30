import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertContract,
  assertEnterpriseConfig,
  baselineOperationsModule,
  buildEnterpriseScenario,
  enterpriseConfigSchema,
  enterpriseOperationsModule,
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

const enterpriseSchemaPath = resolve(
  root,
  "schemas",
  "enterprise",
  "aether-enterprise-config.v1.schema.json",
);
const committedEnterpriseSchema = JSON.parse(
  await readFile(enterpriseSchemaPath, "utf8"),
);
if (
  JSON.stringify(committedEnterpriseSchema) !==
  JSON.stringify(enterpriseConfigSchema())
) {
  throw new Error("registered enterprise schema differs from the committed schema");
}
const enterpriseConfig = JSON.parse(
  await readFile(
    resolve(
      root,
      "scenarios",
      "enterprise",
      "professional-services-customer-engagement.json",
    ),
    "utf8",
  ),
);
assertEnterpriseConfig(enterpriseConfig);
const enterpriseScenario = buildEnterpriseScenario(enterpriseConfig);
const enterpriseKernel = new SimulationKernel({
  modules: [enterpriseOperationsModule],
});
enterpriseKernel.validateScenario(enterpriseScenario);
const enterpriseExport = enterpriseKernel.run(enterpriseScenario);
assertContract("export", enterpriseExport);

process.stdout.write(
  `Validated ${schemaNames.length + 1} schemas and representative contracts.\n`,
);
