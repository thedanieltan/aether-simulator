import {
  economyConfig as configValidator,
  economyEvent as eventValidator,
} from "../validation/standalone.mjs";
import configSchema from "../../schemas/economy/aether-economy-config.v1.schema.json" with { type: "json" };
import eventSchema from "../../schemas/economy/aether-economy-event.v1.schema.json" with { type: "json" };
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
