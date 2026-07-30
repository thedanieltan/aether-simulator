import { defineModule } from "../kernel/module.mjs";
import { assertEconomyEvent } from "../economy/validation.mjs";

function emptyMetrics() {
  return {
    production: 0,
    consumption: 0,
    wages: 0,
    employment: 0,
    unemployment: 0,
    credit: 0,
    defaults: 0,
    closures: 0,
    taxes: 0,
    public_expenditure: 0,
    formations: 0,
    market_volume: 0,
  };
}

function updateBank(state, facts) {
  if (!facts.bank_id) return;
  const sheet = state.bank_balance_sheets[facts.bank_id];
  if (!sheet) throw new TypeError(`unknown bank: ${facts.bank_id}`);
  sheet.assets += facts.bank_asset_delta ?? 0;
  sheet.liabilities += facts.bank_liability_delta ?? 0;
  sheet.equity += facts.bank_equity_delta ?? 0;
  if (sheet.assets !== sheet.liabilities + sheet.equity) {
    throw new TypeError(`bank balance sheet does not reconcile: ${facts.bank_id}`);
  }
}

function updateEmployment(state, facts) {
  if (!facts.person_id) return;
  if (!(facts.person_id in state.balances)) {
    throw new TypeError(`unknown synthetic citizen: ${facts.person_id}`);
  }
  const prior = state.employment[facts.person_id] ?? null;
  if (facts.employment_action === "hired") {
    state.employment[facts.person_id] = facts.employer_id;
  } else if (facts.employment_action === "separated") {
    if (prior !== facts.employer_id) {
      throw new TypeError(`employment separation does not match employer`);
    }
    state.employment[facts.person_id] = null;
  }
}

function addIncome(state, facts) {
  if (!facts.household_id || !facts.income_source) return;
  const income = state.household_income[facts.household_id];
  if (!income) throw new TypeError(`unknown household: ${facts.household_id}`);
  income[facts.income_source] ??= 0;
  income[facts.income_source] += facts.income_amount ?? 0;
}

function updateFirm(state, kind, facts) {
  if (!facts.firm_id) return;
  const firm = state.firms[facts.firm_id];
  if (!firm) throw new TypeError(`unknown firm: ${facts.firm_id}`);
  firm.revenue += facts.revenue ?? 0;
  firm.expenditure += facts.expenditure ?? 0;
  firm.inventory += facts.inventory_delta ?? 0;
  firm.capacity += facts.capacity_delta ?? 0;
  firm.price += facts.price_delta ?? 0;
  firm.demand += facts.demand_delta ?? 0;
  if (facts.status) firm.status = facts.status;
  if (firm.inventory < 0) throw new TypeError(`negative firm inventory: ${facts.firm_id}`);
  if (kind === "closure") firm.status = "closed";
}

function deriveMetrics(state) {
  const employment = Object.values(state.employment).filter(Boolean).length;
  const population = Object.keys(state.employment).length;
  state.metrics.employment = employment;
  state.metrics.unemployment = population - employment;
  state.metrics.credit = Object.values(state.loans).reduce(
    (sum, loan) => sum + loan.outstanding,
    0,
  );
}

export const economyOperationsModule = defineModule({
  moduleId: "economy-operations",
  version: "1.0.0",
  initialize({ config }) {
    const balances = Object.fromEntries(
      config.agents.map((agent) => [agent.id, agent.cash]),
    );
    return {
      balances,
      agent_kinds: Object.fromEntries(
        config.agents.map((agent) => [agent.id, agent.kind]),
      ),
      household_income: Object.fromEntries(
        config.agents
          .filter((agent) => agent.kind === "household")
          .map((agent) => [agent.id, {}]),
      ),
      employment: Object.fromEntries(
        config.citizen_ids.map((personId) => [personId, null]),
      ),
      firms: Object.fromEntries(
        config.agents
          .filter((agent) => agent.kind === "firm" || agent.kind === "nonprofit")
          .map((agent) => [
            agent.id,
            {
              status: "active",
              revenue: 0,
              expenditure: 0,
              inventory: agent.inventory ?? 0,
              capacity: agent.capacity ?? 0,
              price: agent.price ?? 10,
              demand: agent.demand ?? 10,
            },
          ]),
      ),
      bank_balance_sheets: Object.fromEntries(
        config.agents
          .filter((agent) => agent.kind === "bank")
          .map((agent) => [
            agent.id,
            {
              assets: agent.bank_assets,
              liabilities: agent.bank_liabilities,
              equity: agent.bank_equity,
            },
          ]),
      ),
      loans: {},
      taxes: {},
      government_receipts: {},
      market_matches: {},
      shocks: [],
      policies: [],
      transactions: {},
      metrics: emptyMetrics(),
    };
  },
  reduce(state, event) {
    if (event.module_id !== "economy-operations") return state;
    assertEconomyEvent(event.payload);
    const { kind, transaction_id: transactionId, entries, facts } = event.payload;
    if (state.transactions[transactionId]) {
      throw new TypeError(`duplicate economy transaction: ${transactionId}`);
    }
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    if (Math.abs(total) > 1e-9) {
      throw new TypeError(`economy transaction does not reconcile: ${transactionId}`);
    }
    for (const entry of entries) {
      if (!(entry.entity_id in state.balances)) {
        throw new TypeError(`unknown economy counterparty: ${entry.entity_id}`);
      }
      state.balances[entry.entity_id] += entry.amount;
    }

    updateBank(state, facts);
    updateEmployment(state, facts);
    addIncome(state, facts);
    updateFirm(state, kind, facts);

    if (kind === "loan" || kind === "borrowing") {
      state.loans[facts.loan_id] = {
        borrower_id: facts.borrower_id,
        bank_id: facts.bank_id,
        outstanding: facts.principal,
      };
    } else if (kind === "loan-repayment") {
      const loan = state.loans[facts.loan_id];
      if (!loan) throw new TypeError(`unknown loan: ${facts.loan_id}`);
      loan.outstanding -= facts.principal_repaid;
      if (loan.outstanding < 0) throw new TypeError(`loan overpayment: ${facts.loan_id}`);
    } else if (kind === "default") {
      const loan = state.loans[facts.loan_id];
      if (loan) loan.outstanding -= facts.default_amount;
      state.metrics.defaults += 1;
    }

    if (kind === "tax") {
      state.taxes[facts.tax_id] = {
        taxpayer_id: facts.taxpayer_id,
        government_id: facts.government_id,
        amount: facts.tax_amount,
      };
      state.government_receipts[facts.tax_id] = facts.tax_amount;
      state.metrics.taxes += facts.tax_amount;
    }
    if (
      kind === "public-transfer" ||
      kind === "public-procurement" ||
      (kind === "policy-change" && facts.public_expenditure)
    ) {
      state.metrics.public_expenditure += facts.public_expenditure ?? 0;
    }
    if (kind === "production") state.metrics.production += facts.quantity ?? 0;
    if (kind === "consumption") state.metrics.consumption += facts.quantity ?? 0;
    if (kind === "wage") state.metrics.wages += facts.income_amount ?? 0;
    if (kind === "business-formation") state.metrics.formations += 1;
    if (kind === "closure") state.metrics.closures += 1;
    if (kind === "market-clearing") {
      if (facts.matched_quantity !== Math.min(facts.supply, facts.demand)) {
        throw new TypeError(`market match violates declared clearing rule`);
      }
      state.market_matches[transactionId] = structuredClone(facts);
      state.metrics.market_volume += facts.matched_quantity;
    }
    if (kind === "shock") state.shocks.push(structuredClone(facts));
    if (kind === "policy-change") state.policies.push(structuredClone(facts));
    state.transactions[transactionId] = {
      event_id: event.event_id,
      kind,
      entries: structuredClone(entries),
      facts: structuredClone(facts),
    };
    deriveMetrics(state);
    return state;
  },
});
