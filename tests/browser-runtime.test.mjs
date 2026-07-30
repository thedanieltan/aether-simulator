import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { BrowserSimulationRuntime } from "../app/runtime.mjs";
import {
  commandEnabled,
  initialStudioState,
  reduceStudioState,
} from "../app/state.mjs";
import { canonicalCompactJson, runEconomy } from "../src/index.mjs";

const economyConfig = JSON.parse(
  await readFile(
    new URL("../scenarios/economy/stable-baseline.json", import.meta.url),
    "utf8",
  ),
);

test("browser runtime matches the canonical economy kernel byte-for-byte", () => {
  const runtime = new BrowserSimulationRuntime();
  const browser = runtime.execute("run", {
    depth: "economy",
    scenario: "stable-baseline",
    seed: economyConfig.seed,
    scale: economyConfig.scale,
    duration: 80,
  });
  const canonical = runEconomy(economyConfig);
  assert.equal(
    canonicalCompactJson(browser.exported),
    canonicalCompactJson(canonical),
  );
});

test("browser runtime checkpoint, replay, branch, compare, and cancellation work", () => {
  const runtime = new BrowserSimulationRuntime();
  runtime.execute("run", {
    depth: "economy",
    scenario: "policy-intervention-baseline",
    seed: "browser-lifecycle",
    scale: 1,
    duration: 80,
  });
  const checkpointed = runtime.execute("checkpoint");
  assert.ok(checkpointed.checkpoint);
  const replayed = runtime.execute("replay");
  assert.equal(replayed.exported.digest, checkpointed.exported.digest);
  const branched = runtime.execute("branch", { intervention: 12 });
  assert.ok(branched.branch);
  assert.equal(branched.comparison.assumptions.synthetic, true);
  assert.equal(JSON.parse(JSON.stringify(branched)).exported.digest, branched.exported.digest);
  assert.equal(runtime.execute("cancel"), null);
  assert.throws(() => runtime.execute("replay"), /run a scenario first/);
});

test("studio state exposes valid failure, pause, resume, and cancellation controls", () => {
  let state = { ...initialStudioState };
  assert.equal(commandEnabled(state, "replay"), false);
  state = reduceStudioState(state, { type: "command-started", command: "running" });
  assert.equal(commandEnabled(state, "cancel"), true);
  state = reduceStudioState(state, {
    type: "command-completed",
    phase: "paused",
    session: { checkpoint: {} },
  });
  assert.equal(commandEnabled(state, "resume"), true);
  state = reduceStudioState(state, { type: "command-failed", error: "synthetic failure" });
  assert.equal(state.error, "synthetic failure");
  state = reduceStudioState(state, {
    type: "route-selected",
    route: "explore",
    view: "timeline",
  });
  assert.equal(state.activeRoute, "explore");
  assert.equal(state.activeView, "timeline");
  state = reduceStudioState(state, { type: "cancelled" });
  assert.equal(state.phase, "cancelled");
  assert.equal(state.activeRoute, "explore");
});
