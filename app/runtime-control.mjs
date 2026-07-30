export const BROWSER_RUNTIME_ENVELOPE = Object.freeze({
  enterprise: Object.freeze({ maximumScale: 100, maximumDuration: 1_000_000 }),
  ecosystem: Object.freeze({ maximumScale: 10, maximumDuration: 1_000_000 }),
  economy: Object.freeze({ maximumScale: 25, maximumDuration: 80 }),
});

const depthWeights = Object.freeze({
  enterprise: 1,
  ecosystem: 46,
  economy: 17,
});

function positiveSafeInteger(value, label) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return normalized;
}

export function estimateBrowserWorkload({ depth, scale, duration }) {
  const envelope = BROWSER_RUNTIME_ENVELOPE[depth];
  if (!envelope) throw new TypeError(`unsupported product depth: ${depth}`);
  const normalizedScale = positiveSafeInteger(scale, "scale");
  const normalizedDuration = positiveSafeInteger(duration, "duration");
  const durationFactor = depth === "economy" ? Math.max(1, normalizedDuration / 80) : 1;
  const estimatedEventUnits = Math.ceil(
    depthWeights[depth] * normalizedScale * durationFactor,
  );
  const withinEnvelope =
    normalizedScale <= envelope.maximumScale
    && normalizedDuration <= envelope.maximumDuration;
  const utilization = Math.max(
    normalizedScale / envelope.maximumScale,
    normalizedDuration / envelope.maximumDuration,
  );
  return {
    depth,
    scale: normalizedScale,
    duration: normalizedDuration,
    estimatedEventUnits,
    withinEnvelope,
    band: utilization <= 0.25 ? "light" : utilization <= 0.75 ? "moderate" : "upper",
    envelope,
    basis: "Observed local benchmark envelope; timing is host-dependent.",
  };
}

export function assertBrowserWorkload(payload) {
  const estimate = estimateBrowserWorkload(payload);
  if (!estimate.withinEnvelope) {
    throw new RangeError(
      `${estimate.depth} browser runs support scale up to `
      + `${estimate.envelope.maximumScale} and duration up to `
      + `${estimate.envelope.maximumDuration} ticks in the observed interactive envelope; `
      + "use the local CLI to research larger configurations",
    );
  }
  return estimate;
}

