# WP-AES-13 acceptance

## Objective

Provide an honest analysis workspace for descriptive measures, explicit
cohorts, declared event ancestry, and model limitations.

## Implemented

- Versioned deterministic analysis contract.
- Entity, event, relationship, observation, and lineage measures.
- Cohorts derived from declared collection and kind.
- Event-kind distribution and explicit ancestry edges.
- Visible uncertainty and causal-claim boundary.
- Stable after-run route and canonical analysis export.

## Claim boundary

No statistical uncertainty, calibration, prediction, external observation, or
real-world causal effect is estimated. Event ancestry is model-declared.

## Verification contract

- Unit tests cover determinism, measures, cohorts, ancestry semantics,
  interpretation flags, and rejection of authoritative input.
- Browser acceptance covers the workspace, limitations, route, and export.
- The complete repository release gate remains mandatory.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#21`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://b80d4b87.aether-simulator.pages.dev`.
- Hosted acceptance: twelve Playwright journeys passed, including descriptive
  analysis, interpretation boundaries, export, and all accepted workflows.
