import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";
import checkpointSchema from "../schemas/kernel/aether-checkpoint.v1.schema.json" with { type: "json" };
import eventSchema from "../schemas/kernel/aether-event.v1.schema.json" with { type: "json" };
import exportSchema from "../schemas/kernel/aether-export.v1.schema.json" with { type: "json" };
import scenarioSchema from "../schemas/kernel/aether-scenario.v1.schema.json" with { type: "json" };
import worldSchema from "../schemas/kernel/aether-world.v1.schema.json" with { type: "json" };
import enterpriseConfigSchema from "../schemas/enterprise/aether-enterprise-config.v1.schema.json" with { type: "json" };
import ecosystemConfigSchema from "../schemas/ecosystem/aether-ecosystem-config.v1.schema.json" with { type: "json" };
import ecosystemEventSchema from "../schemas/ecosystem/aether-ecosystem-event.v1.schema.json" with { type: "json" };
import economyConfigSchema from "../schemas/economy/aether-economy-config.v1.schema.json" with { type: "json" };
import economyEventSchema from "../schemas/economy/aether-economy-event.v1.schema.json" with { type: "json" };

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "src", "validation", "standalone.mjs");
const schemas = [
  checkpointSchema,
  eventSchema,
  exportSchema,
  scenarioSchema,
  worldSchema,
  enterpriseConfigSchema,
  ecosystemConfigSchema,
  ecosystemEventSchema,
  economyConfigSchema,
  economyEventSchema,
];
const exportsByName = {
  kernelCheckpoint: checkpointSchema.$id,
  kernelEvent: eventSchema.$id,
  kernelExport: exportSchema.$id,
  kernelScenario: scenarioSchema.$id,
  kernelWorld: worldSchema.$id,
  enterpriseConfig: enterpriseConfigSchema.$id,
  ecosystemConfig: ecosystemConfigSchema.$id,
  ecosystemEvent: ecosystemEventSchema.$id,
  economyConfig: economyConfigSchema.$id,
  economyEvent: economyEventSchema.$id,
};

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false,
  code: { esm: true, source: true },
});
for (const schema of schemas) ajv.addSchema(schema);
const runtimeImports = [
  'import equalModule from "ajv/dist/runtime/equal.js";',
  'import ucs2lengthModule from "ajv/dist/runtime/ucs2length.js";',
  "const runtimeEqual = equalModule.default ?? equalModule;",
  "const runtimeUcs2length = ucs2lengthModule.default ?? ucs2lengthModule;",
].join("\n");
const generatedBody = standaloneCode(ajv, exportsByName)
  .replaceAll('require("ajv/dist/runtime/equal").default', "runtimeEqual")
  .replaceAll(
    'require("ajv/dist/runtime/ucs2length").default',
    "runtimeUcs2length",
  );
if (/\brequire\s*\(/.test(generatedBody)) {
  throw new Error("standalone validators contain an unsupported CommonJS runtime import");
}
const generated = `${runtimeImports}\n${generatedBody}\n`;

if (process.argv.includes("--check")) {
  const existing = await readFile(outputPath, "utf8");
  if (existing !== generated) {
    throw new Error("standalone validators are stale; run npm run generate:validators");
  }
  process.stdout.write("Standalone validator generation produced no drift.\n");
} else {
  await writeFile(outputPath, generated);
  process.stdout.write("Generated standalone validators for 10 contracts.\n");
}
