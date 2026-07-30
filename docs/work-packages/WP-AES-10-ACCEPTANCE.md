# WP-AES-10 acceptance

## Objective

Provide a reproducible scenario laboratory that fixes baseline assumptions,
varies one declared intervention, and compares bounded synthetic outcomes.

## Implemented

- `aether-experiment.v1` definition and `aether-experiment-result.v1` output.
- Fixed economy policy baseline with two to eight bounded variants.
- Unique variant identity and finite intervention validation.
- Sequential local-worker branches from one deterministic baseline.
- Branch digest, shared-event, event-delta, semantic-equality, and full outcome
  capture.
- Browser comparison table and canonical result export.
- Persistent visible synthetic and non-authoritative interpretation boundary.

## Claim boundary

The laboratory currently supports one tested economy experiment family. It does
not claim cross-scenario causal inference, calibration, prediction, or
real-world policy validity.

## Verification contract

- Unit tests cover fixed design variables, intervention-only variation,
  expected public-expenditure deltas, deterministic serialization, variant
  bounds, duration bounds, and identity validation.
- Browser acceptance covers local execution, two variants, comparison display,
  interpretation boundary, export, accessibility, and compact widths.
- The complete repository release gate remains mandatory.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#15`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://2a84cbfa.aether-simulator.pages.dev`.
- Hosted acceptance: nine Playwright journeys passed, including the fixed
  baseline, two declared variants, comparison boundary, result export, and all
  previously accepted product workflows.

Only the documented economy experiment family is live accepted.
