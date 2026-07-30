import { canonicalCompactJson } from "../canonical-json.mjs";
import { compareRuns, SimulationKernel } from "../kernel/kernel.mjs";
import { economyOperationsModule } from "../modules/economy-operations.mjs";
import { buildEconomyScenario } from "./scenario-builder.mjs";

export function economyState(exported) {
  const state = exported?.world?.projected_state?.module_state?.["economy-operations"];
  if (!state) throw new TypeError("export contains no economy state");
  return structuredClone(state);
}

export function validateEconomyInvariants(exported) {
  const state = economyState(exported);
  const errors = [];
  for (const [transactionId, transaction] of Object.entries(state.transactions)) {
    const total = transaction.entries.reduce((sum, entry) => sum + entry.amount, 0);
    if (Math.abs(total) > 1e-9) errors.push(`unreconciled transaction: ${transactionId}`);
    const { firm_id: firmId, revenue = 0, expenditure = 0 } = transaction.facts;
    if (firmId && (revenue !== 0 || expenditure !== 0)) {
      const firmEntries = transaction.entries.filter(
        ({ entity_id: entityId }) => entityId === firmId,
      );
      const receipts = firmEntries
        .filter(({ amount }) => amount > 0)
        .reduce((sum, { amount }) => sum + amount, 0);
      const payments = -firmEntries
        .filter(({ amount }) => amount < 0)
        .reduce((sum, { amount }) => sum + amount, 0);
      if (receipts !== revenue || payments !== expenditure) {
        errors.push(`firm counterparty drift: ${transactionId}`);
      }
    }
  }
  for (const [bankId, sheet] of Object.entries(state.bank_balance_sheets)) {
    if (sheet.assets !== sheet.liabilities + sheet.equity) {
      errors.push(`unreconciled bank: ${bankId}`);
    }
  }
  for (const [taxId, tax] of Object.entries(state.taxes)) {
    if (state.government_receipts[taxId] !== tax.amount) {
      errors.push(`unreconciled tax: ${taxId}`);
    }
  }
  const employment = Object.values(state.employment).filter(Boolean).length;
  if (employment !== state.metrics.employment) {
    errors.push("aggregate employment does not derive from entity states");
  }
  const production = Object.values(state.transactions)
    .filter(({ kind }) => kind === "production")
    .reduce((sum, { facts }) => sum + facts.quantity, 0);
  const consumption = Object.values(state.transactions)
    .filter(({ kind }) => kind === "consumption")
    .reduce((sum, { facts }) => sum + facts.quantity, 0);
  if (production !== state.metrics.production) errors.push("production aggregate drift");
  if (consumption !== state.metrics.consumption) errors.push("consumption aggregate drift");
  const credit = Object.values(state.loans).reduce(
    (sum, loan) => sum + loan.outstanding,
    0,
  );
  if (credit !== state.metrics.credit) errors.push("credit aggregate drift");
  for (const [householdId, sources] of Object.entries(state.household_income)) {
    const declared = Object.values(sources).reduce((sum, amount) => sum + amount, 0);
    const fromEvents = Object.values(state.transactions)
      .filter(({ facts }) => facts.household_id === householdId && facts.income_source)
      .reduce((sum, { facts }) => sum + facts.income_amount, 0);
    if (declared !== fromEvents) errors.push(`household income drift: ${householdId}`);
  }
  return { valid: errors.length === 0, errors };
}

export function summarizeEconomyRun(config, exported) {
  const state = economyState(exported);
  return {
    scenario_id: config.scenario_id,
    scenario_kind: config.scenario_kind,
    scale: config.scale,
    citizens: Object.keys(state.employment).length,
    firms: Object.keys(state.firms).length,
    banks: Object.keys(state.bank_balance_sheets).length,
    transactions: Object.keys(state.transactions).length,
    metrics: structuredClone(state.metrics),
    event_count: exported.world.event_log.length,
    digest: exported.digest,
    synthetic: true,
    authoritative: false,
  };
}

export function compareEconomyRuns(left, right, assumptions = {}) {
  const comparison = compareRuns(left, right);
  const leftState = economyState(left);
  const rightState = economyState(right);
  return {
    ...comparison,
    assumptions: {
      synthetic: true,
      authoritative: false,
      declared_intervention: structuredClone(assumptions),
    },
    observed_synthetic_outcomes: Object.keys(leftState.metrics)
      .sort()
      .map((metric) => ({
        metric,
        baseline: leftState.metrics[metric],
        intervention: rightState.metrics[metric],
        difference: rightState.metrics[metric] - leftState.metrics[metric],
      })),
    economy_state_equal:
      canonicalCompactJson(leftState) === canonicalCompactJson(rightState),
  };
}

export function runEconomy(config, { partitionSize } = {}) {
  const scenario = buildEconomyScenario(config, { partitionSize });
  return new SimulationKernel({ modules: [economyOperationsModule] }).run(scenario);
}
