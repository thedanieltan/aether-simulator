# WP-AES-02 acceptance record

## Objective

Transform Enterprise Depth from a fixed fixture into a configurable, stateful
synthetic enterprise simulator using the WP-AES-01 kernel.

## Scope delivered

- Five materially distinct archetypes: professional services, SaaS, retail,
  logistics, and manufacturing.
- Departments, roles, reporting lines, policies, systems, assets, offerings,
  customer/supplier contexts, accounts, resources, and balances.
- Customer, workforce, procurement, inventory, fulfilment, service, accounting,
  data-lifecycle, failure, detection, remediation, and intervention behavior.
- Nine end-to-end scenario configurations.
- Actor-to-evidence causal steps and event-backed PII lineage.
- Formal configuration schema, CLI, canonical fixtures, benchmarks, ADR, and
  documentation.

## Acceptance evidence

The canonical suite proves:

- same-input byte determinism across all nine scenarios;
- five distinct archetype structures, constraints, workflows, resources,
  transactions, and outcomes;
- three materially different complete customer journeys;
- balanced double-entry journals;
- non-negative inventory unless backorders are enabled;
- conserved capacity;
- active-employment payroll;
- reconciled invoices and payments;
- declared workflow state transitions;
- event-backed lineage;
- inactive deletion with retained provenance;
- replay, checkpoint/resume, branch history, and material intervention
  comparison.

Benchmarks execute all five archetypes at scales 1, 10, and 100 without a
hard-coded ceiling. Three full exports, a nine-scenario acceptance summary,
and checkpoint/branch/comparison artifacts are committed and reproducible.

## Exclusions

Independent counterparties, cross-enterprise private state, ecosystem
cascades, economy behavior, connected providers, deployment, and live
acceptance are excluded.

## Status

- Implementation: complete on `codex/wp-aes-02-enterprise-depth`.
- Integration: pending draft-PR review and merge.
- Deployment: not performed.
- Live acceptance: not performed.
- Hosted CI: account billing/spending configuration must permit the workflow;
  local canonical verification remains mandatory.
