import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertContract,
  assertEcosystemConfig,
  assertEcosystemEvent,
  assertEnterpriseConfig,
  baselineOperationsModule,
  buildEnterpriseScenario,
  buildEcosystemScenario,
  ecosystemConfigSchema,
  ecosystemEventSchema,
  ecosystemOperationsModule,
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

const ecosystemSchemaDirectory = resolve(root, "schemas", "ecosystem");
const committedEcosystemConfigSchema = JSON.parse(
  await readFile(
    resolve(
      ecosystemSchemaDirectory,
      "aether-ecosystem-config.v1.schema.json",
    ),
    "utf8",
  ),
);
const committedEcosystemEventSchema = JSON.parse(
  await readFile(
    resolve(
      ecosystemSchemaDirectory,
      "aether-ecosystem-event.v1.schema.json",
    ),
    "utf8",
  ),
);
if (
  JSON.stringify(committedEcosystemConfigSchema) !==
    JSON.stringify(ecosystemConfigSchema()) ||
  JSON.stringify(committedEcosystemEventSchema) !==
    JSON.stringify(ecosystemEventSchema())
) {
  throw new Error("registered ecosystem schemas differ from committed schemas");
}
const ecosystemConfig = JSON.parse(
  await readFile(
    resolve(root, "scenarios", "ecosystem", "saas-service-network.json"),
    "utf8",
  ),
);
assertEcosystemConfig(ecosystemConfig);
const ecosystemScenario = buildEcosystemScenario(ecosystemConfig);
const ecosystemKernel = new SimulationKernel({
  modules: [enterpriseOperationsModule, ecosystemOperationsModule],
});
ecosystemKernel.validateScenario(ecosystemScenario);
const ecosystemExport = ecosystemKernel.run(ecosystemScenario);
for (const event of ecosystemExport.world.event_log) {
  if (event.event_type.startsWith("ecosystem.")) {
    assertEcosystemEvent(event.payload);
  }
}
assertContract("export", ecosystemExport);

process.stdout.write(
  `Validated ${schemaNames.length + 3} schemas and representative contracts.\n`,
);
