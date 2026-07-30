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

Implemented locally on the work-package branch. Protected integration,
deployment, and hosted acceptance must be recorded before this package is
classified as live accepted.

