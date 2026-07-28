# Enterprise Depth

Enterprise Depth simulates one fictional enterprise using the shared
deterministic kernel.

## Archetypes

| Archetype | Distinct operating emphasis |
|---|---|
| Professional services | Billable capacity, engagement delivery, time and collection |
| SaaS | Subscription entitlement, service capacity, support, renewal or churn |
| Retail | Merchandise inventory, fulfilment capacity, order, payment, and refund |
| Logistics | Delivery slots, dispatch, failed delivery, detection, and remediation |
| Manufacturing | Materials, production capacity, procurement, workforce, and finished units |

Archetypes change structures, roles, systems, assets, offerings, constraints,
resource quantities, prices, costs, workflow catalogs, and outcomes. Scale is a
positive integer with no built-in product ceiling.

## Scenario corpus

The committed corpus covers:

1. Professional-services lead to collection.
2. SaaS signup, support, and renewal.
3. Retail order to cash.
4. Logistics failed delivery and remediation.
5. Manufacturing employee lifecycle through departure.
6. Manufacturing procurement to payment.
7. SaaS misconfiguration, outage, and remediation.
8. Retail inventory intervention comparison.
9. Manufacturing production order with utilisation and backlog outcomes.

External customers and suppliers are boundary contexts. They reconcile the
enterprise side of a journey but do not have independently mutable private
state. Cross-enterprise simulation remains Ecosystem Depth and is unimplemented.

## State and invariants

The enterprise projection includes workflow states, balanced journals,
inventory, capacity, employment history, invoices, payments, record lifecycle,
incidents, outcomes, and causal steps. Runtime checks fail closed for:

- unbalanced journal entries;
- negative inventory unless backorders are explicitly enabled;
- capacity outside zero and configured total;
- payroll without active employment;
- invoice overpayment;
- undeclared workflow transitions;
- missing causal predecessors.

Lineage observations reference actual event IDs. Deleted or expired records
remain in provenance history but are not active.

## Local use

```bash
node src/cli.mjs enterprise-archetypes
node src/cli.mjs enterprise-validate scenarios/enterprise/retail-order-to-cash.json
node src/cli.mjs enterprise-run scenarios/enterprise/retail-order-to-cash.json
npm run test:enterprise
npm run benchmark:enterprise
```
