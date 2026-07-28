import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonicalJson, generateWorld } from "../src/index.mjs";

test("same seed produces byte-identical output", () => {
  assert.equal(canonicalJson(generateWorld(424242)), canonicalJson(generateWorld(424242)));
});

test("different seeds produce different world references", () => {
  assert.notEqual(generateWorld(424242).world_ref, generateWorld(424243).world_ref);
});

test("generated output matches the pinned fixture byte-for-byte", async () => {
  const fixture = await readFile(
    new URL("../fixtures/world.seed-424242.json", import.meta.url),
    "utf8",
  );
  assert.equal(canonicalJson(generateWorld(424242)), fixture);
});

test("world includes fictional people, a cross-system workflow and lineage", () => {
  const world = generateWorld(424242);
  assert.equal(world.company.fictional, true);
  assert.ok(world.people.length >= 2);
  assert.ok(world.workflows.some((workflow) => workflow.cross_system));
  assert.ok(world.pii_lineage.records.length > 0);
  assert.ok(world.pii_lineage.records.some((record) => record.copied_from));
});
