# Analysis workspace

The analysis workspace describes one completed deterministic synthetic run. It
does not transform the run into a forecast, calibrated model, or causal study.

## Analysis contract

`aether-analysis.v1` contains:

- total entities, events, relationships, observations, and lineage facts;
- entity counts by collection;
- explicit cohorts grouped by emitted collection and kind;
- event counts by emitted event type;
- declared event-ancestry edges from the event `causes` field;
- the world limitations and a machine-readable interpretation boundary;
- the source world, scenario, and digest identifiers.

All lists are canonically sorted. Reanalyzing the same export produces the same
result.

## Interpretation

The workspace distinguishes an emitted fact from an inference:

- a cohort is a grouping by a declared kind, not a discovered population;
- an ancestry edge is a link the model emitted, not an estimated causal effect;
- a measure describes this run, not an observed external system;
- no confidence interval, statistical uncertainty, calibration, prediction, or
  counterfactual identification is calculated.

The laboratory remains the bounded interface for comparing declared synthetic
interventions against one fixed deterministic baseline.

## Safety boundary

Analysis accepts only explicitly synthetic, non-authoritative world exports.
It runs locally, introduces no provider calls, and exports a canonical local
JSON artifact.

