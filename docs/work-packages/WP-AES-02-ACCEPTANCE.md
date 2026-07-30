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
- Hosted CI: all required Ubuntu Node.js 20, 22, and 24 checks and the Windows
  Node.js 20 portability check passed on 2026-07-30.

## CI/CD gate

The work-package branch adds a read-only, SHA-pinned quality gate covering the
minimum supported Node.js release, current Node.js releases, Windows
portability, deterministic fixture regeneration, package boundaries,
dependency audit, repository policy, and sensitive-content scanning. The exact
local parity command is `npm run verify:ci`.

Continuous deployment is intentionally absent because this work package has no
deployed product or live-acceptance target. The protected `main` branch
requires all four runner-backed checks, an up-to-date branch, pull-request
integration, conversation resolution, and linear history.
