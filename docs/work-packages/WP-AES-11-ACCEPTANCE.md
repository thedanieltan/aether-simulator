# WP-AES-11 acceptance

## Objective

Provide honest browser workload estimation, phase progress, elapsed time, and
cancellation that stops in-flight synchronous execution.

## Implemented

- Deterministic estimates from product depth, scale, and duration.
- Browser-only safety envelopes grounded in committed benchmark observations.
- Accessible native progress, phase detail, and elapsed time.
- Abort-aware worker request adapter.
- Coarse accepted, executing, and validating worker phases.
- Cancellation by worker termination and replacement.
- Recovery proof: a new run succeeds after cancellation.

## Claim boundary

The browser envelope is not a product or kernel ceiling. Timing is not
guaranteed. The synchronous kernel does not expose event-level progress or
mid-tick pause, so the interface does not claim either capability.

## Verification contract

- Unit tests cover estimates, observed bounds, invalid inputs, phase delivery,
  result delivery, and abort behavior.
- Browser acceptance covers depth-sensitive estimates, actual in-flight
  cancellation, worker replacement, and a successful subsequent run.
- The complete repository release gate remains mandatory.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#17`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://26b514d2.aether-simulator.pages.dev`.
- Hosted acceptance: ten Playwright journeys passed, including real in-flight
  cancellation, worker replacement, a successful recovery run, and all
  previously accepted product workflows.
