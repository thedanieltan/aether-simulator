#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalJson } from "./canonical-json.mjs";
import { CONTRACTS } from "./kernel/contracts.mjs";
import {
  assertCheckpointIntegrity,
  assertExportIntegrity,
  compareRuns,
  SimulationKernel,
} from "./kernel/kernel.mjs";
import { migrateLegacyWorld } from "./kernel/migration.mjs";
import { assertContract } from "./kernel/validation.mjs";
import { baselineOperationsModule } from "./modules/baseline-operations.mjs";

const kernel = new SimulationKernel({ modules: [baselineOperationsModule] });

function usage() {
  return `Aether Simulator CLI

Usage:
  aether validate <artifact.json>
  aether run <scenario.json> [--until <tick>] [--output <file>]
  aether replay <scenario.json> <export-or-events.json> [--until <tick>] [--output <file>]
  aether checkpoint <scenario.json> --tick <tick> [--output <file>]
  aether branch <scenario.json> <checkpoint.json> <interventions.json> [--until <tick>] [--output <file>]
  aether compare <left-export.json> <right-export.json> [--output <file>]
  aether migrate <legacy-world.json> [--output <file>]
`;
}

function parseArguments(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const name = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[name] = true;
    } else {
      options[name] = next;
      index += 1;
    }
  }
  return { positional, options };
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

function integerOption(value, name) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new TypeError(`--${name} must be a non-negative safe integer`);
  }
  return parsed;
}

async function emit(value, outputPath) {
  const serialized = canonicalJson(value);
  if (outputPath) await writeFile(resolve(outputPath), serialized, "utf8");
  else process.stdout.write(serialized);
}

function contractKind(value) {
  const version = value?.contract_version;
  return Object.entries(CONTRACTS).find(([, contract]) => contract === version)?.[0];
}

async function execute(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help") {
    process.stdout.write(usage());
    return;
  }
  const { positional, options } = parseArguments(rest);

  if (command === "validate") {
    if (positional.length !== 1) throw new TypeError("validate requires one artifact");
    const artifact = await readJson(positional[0]);
    const kind = contractKind(artifact);
    if (!["scenario", "world", "event", "checkpoint", "export"].includes(kind)) {
      throw new TypeError(`unsupported contract version: ${artifact?.contract_version ?? "missing"}`);
    }
    if (kind === "scenario") kernel.validateScenario(artifact);
    else if (kind === "checkpoint") assertCheckpointIntegrity(artifact);
    else if (kind === "export") assertExportIntegrity(artifact);
    else assertContract(kind, artifact);
    await emit({ valid: true, contract_kind: kind, contract_version: artifact.contract_version });
    return;
  }

  if (command === "run") {
    if (positional.length !== 1) throw new TypeError("run requires one scenario");
    const scenario = await readJson(positional[0]);
    const untilTick = integerOption(options.until, "until");
    await emit(kernel.run(scenario, untilTick === undefined ? {} : { untilTick }), options.output);
    return;
  }

  if (command === "replay") {
    if (positional.length !== 2) {
      throw new TypeError("replay requires a scenario and an export or event log");
    }
    const scenario = await readJson(positional[0]);
    const source = await readJson(positional[1]);
    if (source?.contract_version === CONTRACTS.export) {
      assertExportIntegrity(source);
    }
    const events = Array.isArray(source) ? source : source?.world?.event_log;
    if (!Array.isArray(events)) throw new TypeError("replay source contains no event log");
    const untilTick =
      integerOption(options.until, "until") ??
      source?.world?.clock?.current_tick ??
      scenario.clock.end_tick;
    await emit(kernel.replay(scenario, events, { untilTick }), options.output);
    return;
  }

  if (command === "checkpoint") {
    if (positional.length !== 1) throw new TypeError("checkpoint requires one scenario");
    const tick = integerOption(options.tick, "tick");
    if (tick === undefined) throw new TypeError("checkpoint requires --tick");
    await emit(kernel.checkpoint(await readJson(positional[0]), tick), options.output);
    return;
  }

  if (command === "branch") {
    if (positional.length !== 3) {
      throw new TypeError("branch requires scenario, checkpoint, and interventions files");
    }
    const scenario = await readJson(positional[0]);
    const checkpoint = await readJson(positional[1]);
    const interventionSource = await readJson(positional[2]);
    const interventions = Array.isArray(interventionSource)
      ? interventionSource
      : interventionSource?.interventions;
    if (!Array.isArray(interventions)) {
      throw new TypeError("interventions file must be an array or contain interventions");
    }
    const untilTick =
      integerOption(options.until, "until") ?? scenario.clock.end_tick;
    await emit(
      kernel.branch(scenario, checkpoint, interventions, { untilTick }),
      options.output,
    );
    return;
  }

  if (command === "compare") {
    if (positional.length !== 2) throw new TypeError("compare requires two exports");
    await emit(
      compareRuns(await readJson(positional[0]), await readJson(positional[1])),
      options.output,
    );
    return;
  }

  if (command === "migrate") {
    if (positional.length !== 1) throw new TypeError("migrate requires one legacy world");
    await emit(migrateLegacyWorld(await readJson(positional[0])), options.output);
    return;
  }

  throw new TypeError(`unknown command: ${command}`);
}

execute(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`aether: ${error.message}\n`);
  process.exitCode = 1;
});
