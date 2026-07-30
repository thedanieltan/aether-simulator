import assert from "node:assert/strict";
import test from "node:test";
import { BrowserSimulationRuntime } from "../app/runtime.mjs";
import {
  createExperimentDefinition,
  serializeExperiment,
  summarizeExperiment,
} from "../src/experiments/laboratory.mjs";

const definition = createExperimentDefinition({
  name: "Synthetic transfer comparison",
  seed: "experiment-test",
  scale: 1,
  duration: 80,
  variants: [
    { variant_id: "low", label: "Low transfer", intervention: 8 },
    { variant_id: "high", label: "High transfer", intervention: 20 },
  ],
});

function runDefinition() {
  const runtime = new BrowserSimulationRuntime();
  const baseline = runtime.execute("run", definition.baseline);
  const variants = definition.variants.map((variant) =>
    runtime.execute("branch", {
      ...definition.baseline,
      intervention: variant.intervention,
    }));
  return summarizeExperiment(definition, baseline, variants);
}

test("scenario laboratory holds baseline inputs fixed and varies one intervention", () => {
  assert.deepEqual(
    definition.design.fixed,
    ["depth", "scenario", "seed", "scale", "duration"],
  );
  assert.equal(definition.design.varied, "intervention");
  const result = runDefinition();
  assert.equal(result.results.length, 2);
  assert.equal(
    result.results[0].outcomes.public_expenditure.difference,
    8,
  );
  assert.equal(
    result.results[1].outcomes.public_expenditure.difference,
    20,
  );
  assert.equal(result.synthetic, true);
  assert.equal(result.authoritative, false);
});

test("scenario laboratory results and serialization are deterministic", () => {
  assert.equal(serializeExperiment(runDefinition()), serializeExperiment(runDefinition()));
});

test("scenario laboratory rejects invalid experiment designs", () => {
  assert.throws(
    () => createExperimentDefinition({
      name: "Invalid",
      seed: "seed",
      duration: 80,
      variants: [{ label: "Only one", intervention: 1 }],
    }),
    /2 to 8 variants/,
  );
  assert.throws(
    () => createExperimentDefinition({
      name: "Invalid",
      seed: "seed",
      duration: 20,
      variants: [
        { variant_id: "same", label: "One", intervention: 1 },
        { variant_id: "same", label: "Two", intervention: 2 },
      ],
    }),
    /duration/,
  );
});
