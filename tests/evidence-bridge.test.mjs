import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeWorldEvidence,
  promoteEvidence,
  validateWorldFixture,
} from "../packages/evidence-bridge/src/index.mjs";
import {
  baselineOperationsModule,
  canonicalJson,
  generateWorld,
  SimulationKernel,
} from "../src/index.mjs";

test("validates and deterministically normalizes a synthetic world", () => {
  const world = generateWorld(424242);
  assert.deepEqual(validateWorldFixture(world), { valid: true, errors: [] });
  assert.equal(
    canonicalJson(normalizeWorldEvidence(world)),
    canonicalJson(normalizeWorldEvidence(world)),
  );
});

test("generated evidence matches the pinned fixture and has unique ids", async () => {
  const bundle = normalizeWorldEvidence(generateWorld(424242));
  const fixture = await readFile(
    new URL("../fixtures/evidence.seed-424242.json", import.meta.url),
    "utf8",
  );
  assert.equal(canonicalJson(bundle), fixture);
  assert.equal(
    new Set(bundle.envelopes.map((item) => item.envelope_id)).size,
    bundle.envelopes.length,
  );
});

test("rejects non-synthetic input", () => {
  const world = generateWorld(424242);
  world.provenance.tier = "connected";
  assert.throws(() => normalizeWorldEvidence(world), /only synthetic provenance/);
});

test("keeps promotion explicit and review-bound", () => {
  const bundle = normalizeWorldEvidence(generateWorld(424242));
  const promoted = promoteEvidence(bundle, "review-synthetic-001");
  assert.equal(promoted.release_state, "reviewed");
  assert.ok(promoted.envelopes.every((item) => item.promotion_state === "reviewed"));
});

test("normalization remains facts-only", () => {
  const serialized = canonicalJson(normalizeWorldEvidence(generateWorld(424242)));
  for (const token of ["lawful", "unlawful", "violation", "legally sufficient"]) {
    assert.equal(serialized.toLowerCase().includes(token), false);
  }
});

test("normalizes v1 kernel observations without gaining authority", async () => {
  const scenario = JSON.parse(
    await readFile(
      new URL("../scenarios/kernel-baseline.json", import.meta.url),
      "utf8",
    ),
  );
  const exported = new SimulationKernel({
    modules: [baselineOperationsModule],
  }).run(scenario);
  const normalized = normalizeWorldEvidence(exported);
  assert.equal(normalized.authority, "research-only");
  assert.equal(normalized.release_state, "quarantined");
  assert.equal(normalized.envelopes.length, 1);
  assert.ok(
    normalized.envelopes.every(
      (envelope) =>
        envelope.verification_status === "derived" &&
        envelope.promotion_state === "quarantined",
    ),
  );
});
