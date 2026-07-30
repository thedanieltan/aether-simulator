# Scenario laboratory

## Purpose

The laboratory runs a bounded comparison set against one fixed deterministic
baseline. It is designed for explicit synthetic experiments, not real-world
causal inference.

## Current design

`aether-experiment.v1` currently supports the tested economy policy-intervention
scenario. The experiment fixes:

- product depth;
- committed scenario;
- root seed;
- scale;
- logical duration.

It varies one declared intervention amount across two to eight uniquely
identified variants. This restriction keeps each comparison interpretable and
prevents unrelated seeds or scenarios from being presented as interventions.

## Execution

The browser worker runs the baseline once, creates the kernel checkpoint used by
the economy intervention, and branches each variant from the same baseline.
Results retain branch digests, shared event counts, event-count differences,
semantic equality, and every emitted synthetic outcome delta.

The browser table highlights public-expenditure difference because it is the
directly exercised outcome in this accepted scenario. The canonical result
export retains the complete outcome set.

## Boundary

`aether-experiment-result.v1` is explicitly synthetic and non-authoritative.
Differences are consequences of declared model assumptions. They are not
estimates of a real policy's effect, calibrated forecasts, or evidence of a
real-world causal relationship.

Other scenario families will enter the laboratory only when their branch
semantics and outcome summaries are independently tested.
