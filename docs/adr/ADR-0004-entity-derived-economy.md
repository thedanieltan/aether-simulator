# ADR-0004: Entity-derived synthetic economy

## Status

Accepted for the research preview.

## Decision

Economy Depth uses the existing versioned scenario, entity, relationship,
contract, event, checkpoint, and export contracts. The economy module projects
entity-level counterparty transactions, employment, firm state, household
income, bank balance sheets, taxes, markets, shocks, and aggregate metrics.

Every monetary transaction must have legs summing to zero. Bank asset,
liability, and equity changes must reconcile. Taxes have matching taxpayer and
government records. Aggregates are recomputed from entity states or underlying
transactions and checked by acceptance tests.

Partition size affects construction batching only and is excluded from
semantic scenario input. This preserves byte identity across construction
strategies while leaving worker-parallel execution as explicit future work.

## Consequences

The model remains inspectable and causally grounded, but it is intentionally
simplified. It is not calibrated to a real economy and cannot make forecasts or
authoritative policy claims.
