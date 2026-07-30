# Ecosystem Depth

Ecosystem Depth composes Enterprise Depth organizations inside one shared,
deterministic world. Every organization has its own identity, systems,
resources, balances, and role contexts. Cross-boundary mutation requires a
declared active contract and an append-only event.

## Implemented relationships

- customer, supplier, contractor, employment, and service relationships;
- banks and payment providers;
- software, professional-service, logistics, and fulfilment providers;
- public institutions and shared critical vendors;
- multi-context synthetic citizens with separate organizational and household
  contexts.

## Event families

The `aether-ecosystem-event.v1` payload contract covers contract lifecycle,
orders and trade transactions, intermediated payments, delivery acceptance,
identity contexts, cross-organization record lineage, obligations, deadlines,
notifications, remediation, and causal cascades.

Payments reconcile to zero across payer, intermediary, and payee. Deliveries
retain sender, carrier, recipient, and acceptance state. Cross-organization
record observations reference their actual simulation event. Outputs remain
synthetic and non-authoritative.

## Scenario corpus

1. Software company, payment provider, customer, and support vendor.
2. Retailer, manufacturer, logistics provider, bank, and customers.
3. Professional-services firm, subcontractor, shared software, and client.
4. Critical-vendor outage cascade.
5. Customer-default cascade.
6. Cross-organization data request and lineage.
7. Capacity-restoration intervention comparison.

## Deterministic execution

The scenario builder accepts any positive scale and partition size supported by
the host. Partitioning changes construction batches only; canonical scenario
and world output are byte-identical. Checkpoint, resume, replay, branching, and
comparison use the unchanged shared world kernel.

```bash
node src/cli.mjs ecosystem-validate scenarios/ecosystem/saas-service-network.json
node src/cli.mjs ecosystem-run scenarios/ecosystem/saas-service-network.json
npm run demo:ecosystem
npm run test:ecosystem
npm run benchmark:ecosystem
```
