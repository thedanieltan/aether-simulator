export { canonicalCompactJson, canonicalize, canonicalJson } from "./canonical-json.mjs";
export { generateWorld } from "./generate.mjs";
export { buildLineage } from "./lineage.mjs";
export { CONTRACTS, ENTITY_COLLECTIONS, RECORD_COLLECTIONS } from "./kernel/contracts.mjs";
export { createRandomSubstream, sha256, stableId } from "./kernel/ids.mjs";
export { compareEvents, normalizeEventIntents } from "./kernel/events.mjs";
export { defineModule } from "./kernel/module.mjs";
export {
  assertCheckpointIntegrity,
  assertExportIntegrity,
  compareRuns,
  SimulationKernel,
} from "./kernel/kernel.mjs";
export { legacyWorldToScenario, migrateLegacyWorld } from "./kernel/migration.mjs";
export {
  assertContract,
  registeredSchemas,
  validateContract,
  validateScenarioSemantics,
} from "./kernel/validation.mjs";
export { baselineOperationsModule } from "./modules/baseline-operations.mjs";
