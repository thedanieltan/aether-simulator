import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeWorldEvidence } from "../packages/evidence-bridge/src/index.mjs";
import {
  buildEnterpriseScenario,
  canonicalJson,
  enterpriseOperationsModule,
  enterpriseState,
  SimulationKernel,
  validateEnterpriseInvariants,
} from "../src/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(
  root,
  process.argv[2] ?? "scenarios/enterprise/retail-order-to-cash.json",
);
const config = JSON.parse(await readFile(configPath, "utf8"));
const scenario = buildEnterpriseScenario(config);
const exported = new SimulationKernel({
  modules: [enterpriseOperationsModule],
}).run(scenario);
const state = enterpriseState(exported);
const invariants = validateEnterpriseInvariants(exported);
const evidence = normalizeWorldEvidence(exported);

if (!invariants.valid) {
  throw new Error(`enterprise invariants failed: ${invariants.errors.join("; ")}`);
}

process.stdout.write(
  canonicalJson({
    scenario_id: config.scenario_id,
    archetype: config.archetype,
    journey: config.journey,
    world_id: exported.world.world_id,
    events: exported.world.event_log.length,
    final_workflow_states: state.workflows,
    journals: state.ledger.length,
    inventory_quantity: state.inventory.quantity,
    capacity_available: state.capacity.available,
    causal_steps: Object.keys(state.causal_steps).length,
    evidence_envelopes: evidence.envelopes.length,
    synthetic: true,
    authoritative: false,
  }),
);
