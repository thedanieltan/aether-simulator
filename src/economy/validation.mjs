import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const configSchema = JSON.parse(
  readFileSync(
    new URL("../../schemas/economy/aether-economy-config.v1.schema.json", import.meta.url),
    "utf8",
  ),
);
const eventSchema = JSON.parse(
  readFileSync(
    new URL("../../schemas/economy/aether-economy-event.v1.schema.json", import.meta.url),
    "utf8",
  ),
);
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
const configValidator = ajv.compile(configSchema);
const eventValidator = ajv.compile(eventSchema);

function result(validator, value) {
  const valid = validator(value);
  return {
    valid,
    errors: valid
      ? []
      : (validator.errors ?? []).map(
          (error) => `${error.instancePath || "/"} ${error.message}`,
        ),
  };
}

export function validateEconomyConfig(value) {
  return result(configValidator, value);
}

export function assertEconomyConfig(value) {
  const validation = validateEconomyConfig(value);
  if (!validation.valid) {
    throw new TypeError(`invalid economy configuration: ${validation.errors.join("; ")}`);
  }
  return value;
}

export function validateEconomyEvent(value) {
  return result(eventValidator, value);
}

export function assertEconomyEvent(value) {
  const validation = validateEconomyEvent(value);
  if (!validation.valid) {
    throw new TypeError(`invalid economy event: ${validation.errors.join("; ")}`);
  }
  return value;
}

export function economyConfigSchema() {
  return structuredClone(configSchema);
}

export function economyEventSchema() {
  return structuredClone(eventSchema);
}
