import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = resolve(root, "src", "cli.mjs");
const scenario = resolve(root, "scenarios", "kernel-baseline.json");

function run(args) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("CLI validates and runs a scenario", async () => {
  const validation = JSON.parse(run(["validate", scenario]));
  assert.equal(validation.valid, true);
  const directory = await mkdtemp(resolve(tmpdir(), "aether-cli-"));
  const output = resolve(directory, "run.json");
  run(["run", scenario, "--output", output]);
  const exported = JSON.parse(await readFile(output, "utf8"));
  assert.equal(exported.contract_version, "aether-export.v1");
});

test("CLI supports checkpoint, branch, replay, compare, and migrate", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "aether-cli-"));
  const original = resolve(directory, "original.json");
  const replay = resolve(directory, "replay.json");
  const checkpoint = resolve(directory, "checkpoint.json");
  const branch = resolve(directory, "branch.json");
  const comparison = resolve(directory, "comparison.json");
  const migration = resolve(directory, "migration.json");
  const interventions = resolve(
    root,
    "scenarios",
    "interventions",
    "baseline-credit-adjustment.json",
  );
  const legacy = resolve(root, "fixtures", "world.seed-424242.json");

  run(["run", scenario, "--output", original]);
  run(["replay", scenario, original, "--output", replay]);
  assert.equal(await readFile(original, "utf8"), await readFile(replay, "utf8"));
  run(["checkpoint", scenario, "--tick", "2", "--output", checkpoint]);
  run(["branch", scenario, checkpoint, interventions, "--output", branch]);
  run(["compare", original, branch, "--output", comparison]);
  assert.equal(JSON.parse(await readFile(comparison, "utf8")).semantically_equal, false);
  run(["migrate", legacy, "--output", migration]);
  assert.equal(
    JSON.parse(await readFile(migration, "utf8")).target_contract_version,
    "aether-world.v1",
  );
});

test("CLI fails closed for an unsupported contract", () => {
  const result = spawnSync(
    process.execPath,
    [cli, "validate", resolve(root, "scenarios", "minimal-enterprise.json")],
    { cwd: root, encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported contract version/);
});
