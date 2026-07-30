import {
  kernelCheckpoint,
  kernelEvent,
  kernelExport,
  kernelScenario,
  kernelWorld,
} from "../validation/standalone.mjs";
import checkpointSchema from "../../schemas/kernel/aether-checkpoint.v1.schema.json" with { type: "json" };
import eventSchema from "../../schemas/kernel/aether-event.v1.schema.json" with { type: "json" };
import exportSchema from "../../schemas/kernel/aether-export.v1.schema.json" with { type: "json" };
import scenarioSchema from "../../schemas/kernel/aether-scenario.v1.schema.json" with { type: "json" };
import worldSchema from "../../schemas/kernel/aether-world.v1.schema.json" with { type: "json" };

const schemas = {
  event: eventSchema,
  scenario: scenarioSchema,
  world: worldSchema,
  checkpoint: checkpointSchema,
  export: exportSchema,
};

const validators = {
  event: kernelEvent,
  scenario: kernelScenario,
  world: kernelWorld,
  checkpoint: kernelCheckpoint,
  export: kernelExport,
};

function formatErrors(errors = []) {
  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
}

export function validateContract(kind, value) {
  const validator = validators[kind];
  if (!validator) throw new TypeError(`unknown contract kind: ${kind}`);
  const valid = validator(value);
  return {
    valid: Boolean(valid),
    errors: valid ? [] : structuredClone(validator.errors ?? []),
  };
}

export function assertContract(kind, value) {
  const result = validateContract(kind, value);
  if (!result.valid) {
    throw new TypeError(`invalid ${kind} contract: ${formatErrors(result.errors)}`);
  }
  return value;
}

export function validateScenarioSemantics(scenario, registeredModuleIds = []) {
  assertContract("scenario", scenario);
  const errors = [];
  if (scenario.clock.end_tick < scenario.clock.start_tick) {
    errors.push("clock.end_tick must be greater than or equal to clock.start_tick");
  }

  const moduleIds = scenario.modules.map((module) => module.module_id);
  if (new Set(moduleIds).size !== moduleIds.length) {
    errors.push("scenario module ids must be unique");
  }
  const registered = new Set(["core", ...registeredModuleIds]);
  for (const moduleId of moduleIds) {
    if (!registered.has(moduleId)) errors.push(`unregistered module: ${moduleId}`);
  }

  const ids = [];
  for (const values of Object.values(scenario.initial_state)) {
    if (!Array.isArray(values)) continue;
    for (const value of values) ids.push(value.id);
  }
  if (new Set(ids).size !== ids.length) {
    errors.push("initial state identifiers must be globally unique");
  }

  const accountIds = new Set(scenario.initial_state.accounts.map((account) => account.id));
  for (const balance of scenario.initial_state.balances) {
    if (!accountIds.has(balance.account_id)) {
      errors.push(`balance ${balance.id} references unknown account ${balance.account_id}`);
    }
  }

  const activeModules = new Set(["core", ...moduleIds]);
  for (const event of scenario.scheduled_events) {
    if (event.tick < scenario.clock.start_tick || event.tick > scenario.clock.end_tick) {
      errors.push(`event ${event.event_type} tick is outside the scenario clock`);
    }
    if (!activeModules.has(event.module_id)) {
      errors.push(`event ${event.event_type} references inactive module ${event.module_id}`);
    }
  }

  if (errors.length > 0) {
    throw new TypeError(`invalid scenario semantics: ${errors.join("; ")}`);
  }
  return scenario;
}

export function registeredSchemas() {
  return structuredClone(schemas);
}
