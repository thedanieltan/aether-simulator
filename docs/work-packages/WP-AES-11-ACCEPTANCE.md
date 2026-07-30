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

Implemented locally on the work-package branch. Protected integration,
deployment, and hosted acceptance must be recorded before this package is
classified as live accepted.

