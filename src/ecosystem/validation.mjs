import {
  ecosystemConfig as validateConfig,
  ecosystemEvent as validateEvent,
} from "../validation/standalone.mjs";
import configSchema from "../../schemas/ecosystem/aether-ecosystem-config.v1.schema.json" with { type: "json" };
import eventSchema from "../../schemas/ecosystem/aether-ecosystem-event.v1.schema.json" with { type: "json" };
function result(validator, value) {
  const valid = validator(value);
  return {
    valid: Boolean(valid),
    errors: valid ? [] : structuredClone(validator.errors ?? []),
  };
}

function format(errors) {
  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
}

export function validateEcosystemConfig(value) {
  return result(validateConfig, value);
}

export function assertEcosystemConfig(value) {
  const validation = validateEcosystemConfig(value);
  if (!validation.valid) {
    throw new TypeError(`invalid ecosystem config: ${format(validation.errors)}`);
  }
  return value;
}

export function validateEcosystemEvent(value) {
  return result(validateEvent, value);
}

export function assertEcosystemEvent(value) {
  const validation = validateEcosystemEvent(value);
  if (!validation.valid) {
    throw new TypeError(`invalid ecosystem event: ${format(validation.errors)}`);
  }
  return value;
}

export function ecosystemConfigSchema() {
  return structuredClone(configSchema);
}

export function ecosystemEventSchema() {
  return structuredClone(eventSchema);
}
