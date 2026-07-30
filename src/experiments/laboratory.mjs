export const EXPERIMENT_CONTRACT = "aether-experiment.v1";
export const EXPERIMENT_RESULT_CONTRACT = "aether-experiment-result.v1";

function cleanText(value, field, maximum = 120) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  if (value.trim().length > maximum) throw new TypeError(`${field} is too long`);
  return value.trim();
}

export function createExperimentDefinition({
  name,
  seed,
  scale = 1,
  duration = 80,
  variants,
}) {
  const normalizedScale = Number(scale);
  const normalizedDuration = Number(duration);
  if (!Number.isSafeInteger(normalizedScale) || normalizedScale < 1 || normalizedScale > 10_000) {
    throw new TypeError("experiment scale must be an integer from 1 to 10000");
  }
  if (!Number.isSafeInteger(normalizedDuration) || normalizedDuration < 60 || normalizedDuration > 1_000_000) {
    throw new TypeError("experiment duration must be an integer from 60 to 1000000");
  }
  if (!Array.isArray(variants) || variants.length < 2 || variants.length > 8) {
    throw new TypeError("experiment requires from 2 to 8 variants");
  }
  const normalizedVariants = variants.map((variant, index) => {
    const amount = Number(variant.intervention);
    if (!Number.isFinite(amount)) throw new TypeError("variant intervention must be finite");
    return {
      variant_id: cleanText(variant.variant_id ?? `variant-${index + 1}`, "variant id", 80),
      label: cleanText(variant.label, "variant label", 100),
      intervention: amount,
    };
  });
  if (new Set(normalizedVariants.map(({ variant_id: id }) => id)).size !== normalizedVariants.length) {
    throw new TypeError("variant identifiers must be unique");
  }
  return {
    contract_version: EXPERIMENT_CONTRACT,
    name: cleanText(name, "experiment name", 100),
    design: {
      fixed: ["depth", "scenario", "seed", "scale", "duration"],
      varied: "intervention",
      interpretation: "synthetic comparison, not a real-world causal estimate",
    },
    baseline: {
      depth: "economy",
      scenario: "policy-intervention-baseline",
      seed: cleanText(seed, "experiment seed", 160),
      scale: normalizedScale,
      duration: normalizedDuration,
      intervention: 0,
    },
    variants: normalizedVariants,
  };
}

export function summarizeExperiment(definition, baselineSession, variantSessions) {
  if (definition?.contract_version !== EXPERIMENT_CONTRACT) {
    throw new TypeError("a versioned experiment definition is required");
  }
  if (!baselineSession?.exported?.digest) throw new TypeError("baseline session is required");
  if (!Array.isArray(variantSessions) || variantSessions.length !== definition.variants.length) {
    throw new TypeError("every experiment variant requires a result");
  }
  const results = definition.variants.map((variant, index) => {
    const session = variantSessions[index];
    const comparison = session?.comparison;
    if (!comparison || comparison.assumptions?.synthetic !== true) {
      throw new TypeError(`variant ${variant.variant_id} lacks a synthetic comparison`);
    }
    const outcomes = Object.fromEntries(
      (comparison.observed_synthetic_outcomes ?? []).map((outcome) => [
        outcome.metric,
        {
          baseline: outcome.baseline,
          intervention: outcome.intervention,
          difference: outcome.difference,
        },
      ]),
    );
    return {
      ...variant,
      branch_digest: session.branch.digest,
      shared_event_count: comparison.shared_event_count,
      event_count_difference:
        comparison.right_event_count - comparison.left_event_count,
      semantically_equal: comparison.semantically_equal,
      outcomes,
    };
  });
  return {
    contract_version: EXPERIMENT_RESULT_CONTRACT,
    definition: structuredClone(definition),
    baseline_digest: baselineSession.exported.digest,
    synthetic: true,
    authoritative: false,
    results,
  };
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

export function serializeExperiment(value) {
  if (![EXPERIMENT_CONTRACT, EXPERIMENT_RESULT_CONTRACT].includes(value?.contract_version)) {
    throw new TypeError("a versioned experiment definition or result is required");
  }
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}
