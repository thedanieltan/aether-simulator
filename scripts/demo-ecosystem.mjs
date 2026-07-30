import { readFile } from "node:fs/promises";
import {
  buildEcosystemScenario,
  ecosystemOperationsModule,
  ecosystemState,
  enterpriseOperationsModule,
  SimulationKernel,
  validateEcosystemInvariants,
} from "../src/index.mjs";

const config = JSON.parse(
  await readFile(
    new URL("../scenarios/ecosystem/saas-service-network.json", import.meta.url),
    "utf8",
  ),
);
const kernel = new SimulationKernel({
  modules: [enterpriseOperationsModule, ecosystemOperationsModule],
});
const exported = kernel.run(buildEcosystemScenario(config));
const state = ecosystemState(exported);
const invariants = validateEcosystemInvariants(exported);
if (!invariants.valid) {
  throw new Error(`ecosystem invariants failed: ${invariants.errors.join("; ")}`);
}
process.stdout.write(
  `${JSON.stringify(
    {
      scenario_id: config.scenario_id,
      organizations: Object.keys(state.organizations).length,
      identity_contexts: Object.keys(state.identity_contexts).length,
      payments: Object.keys(state.payments).length,
      data_transfers: Object.keys(state.data_transfers).length,
      cascades: Object.keys(state.cascades).length,
      synthetic: true,
      authoritative: false,
    },
    null,
    2,
  )}\n`,
);
