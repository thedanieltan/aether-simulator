export const BLUEPRINT_CONTRACT = "aether-scenario-blueprint.v1";

const supportedDepths = new Set(["enterprise", "ecosystem", "economy"]);
const nodeDefinitions = [
  ["premise", "Premise", "Select a supported depth and committed scenario."],
  ["population", "Population", "Set the deterministic construction scale."],
  ["time", "Simulation time", "Set the requested duration in logical ticks."],
  ["intervention", "Intervention", "Set the explicit branch intervention value."],
  ["reproducibility", "Reproducibility", "Set the root seed for deterministic replay."],
];

function cleanText(value, field, maximum) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} is required`);
  }
  if (value.trim().length > maximum) {
    throw new TypeError(`${field} exceeds ${maximum} characters`);
  }
  return value.trim();
}

function validateConfiguration(configuration) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw new TypeError("blueprint configuration must be an object");
  }
  if (!supportedDepths.has(configuration.depth)) {
    throw new TypeError("blueprint depth is unsupported");
  }
  const scale = Number(configuration.scale);
  const duration = Number(configuration.duration);
  const intervention = Number(configuration.intervention);
  if (!Number.isSafeInteger(scale) || scale < 1 || scale > 10_000) {
    throw new TypeError("blueprint scale must be an integer from 1 to 10000");
  }
  if (!Number.isSafeInteger(duration) || duration < 1 || duration > 1_000_000) {
    throw new TypeError("blueprint duration must be an integer from 1 to 1000000");
  }
  if (!Number.isFinite(intervention)) {
    throw new TypeError("blueprint intervention must be finite");
  }
  return {
    depth: configuration.depth,
    scenario: cleanText(configuration.scenario, "blueprint scenario", 120),
    scale,
    duration,
    intervention,
    seed: cleanText(configuration.seed, "blueprint seed", 160),
  };
}

function expectedEdges() {
  return nodeDefinitions.slice(0, -1).map(([from], index) => ({
    from,
    to: nodeDefinitions[index + 1][0],
  }));
}

export function createScenarioBlueprint(configuration) {
  const validated = validateConfiguration(configuration);
  return {
    contract_version: BLUEPRINT_CONTRACT,
    configuration: validated,
    nodes: nodeDefinitions.map(([nodeId, label, purpose], index) => ({
      node_id: nodeId,
      order: index + 1,
      label,
      purpose,
    })),
    edges: expectedEdges(),
  };
}

export function validateScenarioBlueprint(blueprint, scenarioCatalog) {
  const errors = [];
  if (blueprint?.contract_version !== BLUEPRINT_CONTRACT) {
    errors.push(`unsupported blueprint contract: ${blueprint?.contract_version}`);
  }
  let configuration = null;
  try {
    configuration = validateConfiguration(blueprint?.configuration);
  } catch (error) {
    errors.push(error.message);
  }
  const expectedNodes = nodeDefinitions.map(([nodeId]) => nodeId);
  const actualNodes = blueprint?.nodes?.map(({ node_id: nodeId }) => nodeId) ?? [];
  if (JSON.stringify(actualNodes) !== JSON.stringify(expectedNodes)) {
    errors.push("blueprint nodes must use the supported deterministic pipeline");
  }
  if (JSON.stringify(blueprint?.edges) !== JSON.stringify(expectedEdges())) {
    errors.push("blueprint edges must connect the supported deterministic pipeline");
  }
  if (
    configuration
    && scenarioCatalog
    && !(scenarioCatalog[configuration.depth] ?? [])
      .some(([scenarioId]) => scenarioId === configuration.scenario)
  ) {
    errors.push("blueprint scenario is not available for the selected depth");
  }
  return { valid: errors.length === 0, errors, configuration };
}

export function compileScenarioBlueprint(blueprint, scenarioCatalog) {
  const result = validateScenarioBlueprint(blueprint, scenarioCatalog);
  if (!result.valid) throw new TypeError(result.errors.join("; "));
  return structuredClone(result.configuration);
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

export function serializeScenarioBlueprint(blueprint, scenarioCatalog) {
  const valid = createScenarioBlueprint(
    compileScenarioBlueprint(blueprint, scenarioCatalog),
  );
  return `${JSON.stringify(sortValue(valid), null, 2)}\n`;
}
