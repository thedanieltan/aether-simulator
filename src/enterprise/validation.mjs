import { enterpriseConfig as validate } from "../validation/standalone.mjs";
import schema from "../../schemas/enterprise/aether-enterprise-config.v1.schema.json" with { type: "json" };

function formatErrors(errors = []) {
  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
}

export function validateEnterpriseConfig(config) {
  const schemaValid = validate(config);
  const errors = schemaValid ? [] : structuredClone(validate.errors ?? []);
  if (schemaValid) {
    const allowedJourneys = {
      "professional-services": [
        "customer-engagement",
        "employee-lifecycle",
        "procurement-to-payment",
        "outage-remediation",
      ],
      saas: [
        "saas-lifecycle",
        "employee-lifecycle",
        "procurement-to-payment",
        "outage-remediation",
      ],
      retail: [
        "order-to-cash",
        "employee-lifecycle",
        "procurement-to-payment",
        "outage-remediation",
        "intervention-baseline",
      ],
      logistics: [
        "delivery-exception",
        "employee-lifecycle",
        "procurement-to-payment",
        "outage-remediation",
      ],
      manufacturing: [
        "order-to-cash",
        "employee-lifecycle",
        "procurement-to-payment",
        "outage-remediation",
      ],
    };
    if (!allowedJourneys[config.archetype].includes(config.journey)) {
      errors.push({
        instancePath: "/journey",
        message: `is not supported by archetype ${config.archetype}`,
      });
    }
    const allowedOutcomes = {
      "saas-lifecycle": ["renew", "churn"],
      "order-to-cash": ["complete", "refund"],
      "intervention-baseline": ["complete"],
      "delivery-exception": ["failed-then-remediated"],
      "outage-remediation": ["failed-then-remediated"],
      "customer-engagement": ["complete"],
      "employee-lifecycle": ["complete"],
      "procurement-to-payment": ["complete"],
    };
    if (!allowedOutcomes[config.journey].includes(config.options.outcome)) {
      errors.push({
        instancePath: "/options/outcome",
        message: `is not supported by journey ${config.journey}`,
      });
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertEnterpriseConfig(config) {
  const result = validateEnterpriseConfig(config);
  if (!result.valid) {
    throw new TypeError(
      `invalid enterprise config: ${formatErrors(result.errors)}`,
    );
  }
  return config;
}

export function enterpriseConfigSchema() {
  return structuredClone(schema);
}
