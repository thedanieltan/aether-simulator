# Economy Depth

Economy Depth extends the shared deterministic world model with synthetic
citizens, households, firms, nonprofits, banks, government, regulators, and
market institutions. Aggregate indicators are projections of entity-level
events; no disconnected macroeconomic series is generated.

## Implemented mechanisms

- employment, separation, wages, household income, consumption, and saving;
- production, inventory, pricing, supply payments, investment, restructuring,
  formation, insolvency, and closure;
- loans, repayment, interest, credit, default, and reconciled bank
  balance-sheet effects;
- generic configurable taxation, transfers, procurement, and policy changes;
- deterministic market clearing using the minimum of declared supply and
  demand;
- demand, supply, interest, credit, labour, input-price, insolvency, payment,
  tax, and spending shocks;
- event-derived employment, production, consumption, credit, default, closure,
  tax, public-expenditure, and market-volume metrics.

## Scenario corpus

1. Stable baseline economy.
2. Demand shock and recovery.
3. Supply-chain shock.
4. Credit tightening and default cascade.
5. Policy intervention comparison.
6. Major employer failure.
7. Business formation and failure.

Construction can be planned in arbitrary positive partitions. Partition size
is not semantic input, so single-batch and partitioned construction produce
byte-identical scenarios and worlds. The current implementation remains a
single-process deterministic research runtime; worker-parallel execution is
future engineering.

```bash
node src/cli.mjs economy-validate scenarios/economy/stable-baseline.json
node src/cli.mjs economy-run scenarios/economy/stable-baseline.json
npm run demo:economy
npm run test:economy
npm run benchmark:economy
```

The outputs are simplified synthetic research artifacts. They are not economic
forecasts, investment guidance, policy advice, or authoritative evidence.
