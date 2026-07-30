import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildUnifiedEntityIndex,
  findUnifiedEntity,
} from "../src/entities/unified.mjs";
import { canonicalCompactJson } from "../src/canonical-json.mjs";

async function fixture(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

const enterprise = await fixture(
  "../fixtures/enterprise/retail-order-to-cash.export.json",
);
const ecosystem = await fixture(
  "../fixtures/ecosystem/saas-service-network.export.json",
);
const economy = await fixture("../fixtures/economy/stable-baseline.export.json");

test("unified entity index covers every entity deterministically", () => {
  for (const exported of [enterprise, ecosystem, economy]) {
    const first = buildUnifiedEntityIndex(exported.world);
    const second = buildUnifiedEntityIndex(exported.world);
    const expected = Object.values(exported.world.entities)
      .reduce((sum, entities) => sum + entities.length, 0);
    assert.equal(first.records.length, expected);
    assert.equal(canonicalCompactJson(first), canonicalCompactJson(second));
    assert.equal(first.synthetic, true);
    assert.equal(first.authoritative, false);
  }
});

test("enterprise people expose employment role and department context", () => {
  const index = buildUnifiedEntityIndex(enterprise.world);
  const associate = index.records.find(
    ({ collection, attributes }) =>
      collection === "people" && attributes.role === "store-associate",
  );
  assert.ok(associate);
  const employment = associate.contexts.find(({ kind }) => kind === "employment");
  assert.equal(employment.role, "store-associate");
  assert.equal(employment.attributes.department, "store-operations");
  assert.ok(findUnifiedEntity(index, employment.counterpart_id));
});

test("shared citizen identity retains all organization and household roles", () => {
  const index = buildUnifiedEntityIndex(ecosystem.world);
  const citizen = index.records.find(({ collection }) => collection === "people");
  const roles = citizen.contexts
    .filter(({ kind }) => kind === "identity-context")
    .map(({ role }) => role)
    .sort();
  assert.deepEqual(roles, [
    "customer",
    "director",
    "employee",
    "household-member",
    "vendor-representative",
  ]);
});

test("economy citizens expose household and employment contexts", () => {
  const index = buildUnifiedEntityIndex(economy.world);
  const people = index.records.filter(({ collection }) => collection === "people");
  assert.ok(people.length > 0);
  assert.ok(people.some(({ contexts }) =>
    contexts.some(({ kind }) => kind === "household-membership")));
  assert.ok(people.some(({ contexts }) =>
    contexts.some(({ kind }) => kind === "employment-market")));
});

test("unified entity index rejects authoritative or non-synthetic input", () => {
  const world = structuredClone(enterprise.world);
  world.provenance.authoritative = true;
  assert.throws(
    () => buildUnifiedEntityIndex(world),
    /synthetic non-authoritative world/,
  );
});
