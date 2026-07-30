import { readFile } from "node:fs/promises";
import {
  runEconomy,
  summarizeEconomyRun,
  validateEconomyInvariants,
} from "../src/index.mjs";

const config = JSON.parse(
  await readFile(new URL("../scenarios/economy/stable-baseline.json", import.meta.url), "utf8"),
);
const exported = runEconomy(config, { partitionSize: 1 });
const invariants = validateEconomyInvariants(exported);
if (!invariants.valid) {
  throw new Error(`economy invariants failed: ${invariants.errors.join("; ")}`);
}
process.stdout.write(`${JSON.stringify(summarizeEconomyRun(config, exported), null, 2)}\n`);
