import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  buildEconomyIntervention,
  buildEconomyScenario,
  canonicalCompactJson,
  compareEconomyRuns,
  economyOperationsModule,
  economyPartitionPlan,
  economyState,
  runEconomy,
  SimulationKernel,
  summarizeEconomyRun,
  validateEconomyConfig,
  validateEconomyInvariants,
} from "../src/index.mjs";

const scenarioDirectory = new URL("../scenarios/economy/", import.meta.url);

async function configs() {
  const names = (await readdir(scenarioDirectory)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => ({
    name,
    value: JSON.parse(await readFile(new URL(name, scenarioDirectory), "utf8")),
  })));
}

function kernel() {
  return new SimulationKernel({ modules: [economyOperationsModule] });
}

test("all economy scenarios are deterministic and invariant-safe", async () => {
  const corpus = await configs();
  assert.equal(corpus.length, 7);
  for (const { value } of corpus) {
    assert.equal(validateEconomyConfig(value).valid, true);
    const scenario = buildEconomyScenario(value);
    const first = kernel().run(scenario);
    const second = kernel().run(scenario);
    assert.equal(canonicalCompactJson(first), canonicalCompactJson(second));
    assert.deepEqual(validateEconomyInvariants(first), { valid: true, errors: [] });
  }
});

test("household income and firm counterparty legs reconcile", async () => {
  const [{ value }] = await configs();
  const state = economyState(kernel().run(buildEconomyScenario(value)));
  for (const sources of Object.values(state.household_income)) {
    assert.ok(sources.wages > 0);
    assert.ok(sources.transfers > 0);
  }
  for (const transaction of Object.values(state.transactions)) {
    assert.equal(transaction.entries.reduce((sum, entry) => sum + entry.amount, 0), 0);
  }
});

test("bank assets, liabilities, loans, and defaults reconcile", async () => {
  const config = JSON.parse(
    await readFile(new URL("credit-tightening-default.json", scenarioDirectory), "utf8"),
  );
  const state = economyState(runEconomy(config));
  for (const sheet of Object.values(state.bank_balance_sheets)) {
    assert.equal(sheet.assets, sheet.liabilities + sheet.equity);
  }
  assert.equal(state.metrics.defaults, config.scale * 2);
  assert.equal(
    Object.values(state.loans).filter(
      ({ borrower_id: borrowerId }) => state.agent_kinds[borrowerId] === "household",
    ).length,
    config.scale,
  );
  assert.equal(
    state.metrics.credit,
    Object.values(state.loans).reduce((sum, loan) => sum + loan.outstanding, 0),
  );
});

test("tax payments equal government receipts", async () => {
  const config = JSON.parse(
    await readFile(new URL("stable-baseline.json", scenarioDirectory), "utf8"),
  );
  const state = economyState(runEconomy(config));
  for (const [taxId, tax] of Object.entries(state.taxes)) {
    assert.equal(state.government_receipts[taxId], tax.amount);
  }
  assert.equal(state.metrics.taxes, config.scale * 10);
});

test("aggregate metrics derive from transactions and employment", async () => {
  const config = JSON.parse(
    await readFile(new URL("major-employer-failure.json", scenarioDirectory), "utf8"),
  );
  const state = economyState(runEconomy(config));
  assert.equal(state.metrics.employment, 0);
  assert.equal(state.metrics.unemployment, config.scale);
  assert.equal(state.metrics.closures, config.scale);
  assert.equal(
    state.metrics.production,
    Object.values(state.transactions)
      .filter(({ kind }) => kind === "production")
      .reduce((sum, transaction) => sum + transaction.facts.quantity, 0),
  );
});

test("market clearing uses the declared minimum rule", async () => {
  const config = JSON.parse(
    await readFile(new URL("stable-baseline.json", scenarioDirectory), "utf8"),
  );
  const state = economyState(runEconomy(config));
  for (const match of Object.values(state.market_matches)) {
    assert.equal(match.matched_quantity, Math.min(match.supply, match.demand));
  }
});

test("single-batch and partitioned construction produce identical worlds", async () => {
  const config = JSON.parse(
    await readFile(new URL("supply-chain-shock.json", scenarioDirectory), "utf8"),
  );
  const single = runEconomy(config, { partitionSize: config.scale });
  const partitioned = runEconomy(config, { partitionSize: 1 });
  assert.equal(canonicalCompactJson(single), canonicalCompactJson(partitioned));
  assert.deepEqual(economyPartitionPlan(config, 1).flatMap((entry) => entry.cluster_ids), [0, 1]);
});

test("checkpoint, resume, and replay remain byte-identical", async () => {
  const config = JSON.parse(
    await readFile(new URL("stable-baseline.json", scenarioDirectory), "utf8"),
  );
  const scenario = buildEconomyScenario(config);
  const engine = kernel();
  const complete = engine.run(scenario);
  const checkpoint = engine.checkpoint(scenario, 10);
  assert.equal(canonicalCompactJson(engine.resume(scenario, checkpoint)), canonicalCompactJson(complete));
  assert.equal(
    canonicalCompactJson(engine.replay(scenario, complete.world.event_log)),
    canonicalCompactJson(complete),
  );
});

test("policy comparison separates assumptions from synthetic outcomes", async () => {
  const config = JSON.parse(
    await readFile(new URL("policy-intervention-baseline.json", scenarioDirectory), "utf8"),
  );
  const scenario = buildEconomyScenario(config);
  const engine = kernel();
  const baseline = engine.run(scenario);
  const checkpoint = engine.checkpoint(scenario, 16);
  const intervention = engine.branch(
    scenario,
    checkpoint,
    buildEconomyIntervention(config, { tick: 17, transfer: 12 }),
  );
  const comparison = compareEconomyRuns(baseline, intervention, {
    transfer: 12,
    mechanism: "declared household transfer",
  });
  assert.equal(comparison.assumptions.synthetic, true);
  assert.equal(comparison.assumptions.authoritative, false);
  assert.equal(comparison.economy_state_equal, false);
  assert.equal(
    comparison.observed_synthetic_outcomes.find(
      ({ metric }) => metric === "public_expenditure",
    ).difference,
    12,
  );
});

test("shock corpus covers every required family", async () => {
  const kinds = new Set();
  for (const { value } of await configs()) {
    for (const shock of economyState(runEconomy(value)).shocks) kinds.add(shock.shock_kind);
  }
  for (const expected of [
    "demand-contraction",
    "supply-disruption",
    "interest-rate-change",
    "credit-tightening",
    "labour-shortage",
    "energy-input-price-increase",
    "major-firm-insolvency",
    "payment-system-outage",
    "tax-and-spending-change",
  ]) {
    assert.equal(kinds.has(expected), true, expected);
  }
});

test("summary is explicitly synthetic and non-authoritative", async () => {
  const config = JSON.parse(
    await readFile(new URL("stable-baseline.json", scenarioDirectory), "utf8"),
  );
  const summary = summarizeEconomyRun(config, runEconomy(config));
  assert.equal(summary.synthetic, true);
  assert.equal(summary.authoritative, false);
  assert.equal(summary.citizens, config.scale);
});

test("invalid economy configuration fails closed", () => {
  const invalid = {
    contract_version: "aether-economy-config.v1",
    scenario_id: "invalid",
    scenario_kind: "stable-baseline",
    seed: 1,
    scale: 0,
    periods: 2,
  };
  assert.equal(validateEconomyConfig(invalid).valid, false);
  assert.throws(() => buildEconomyScenario(invalid), /invalid economy configuration/);
});
