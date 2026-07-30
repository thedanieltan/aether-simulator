# WP-AES-09 acceptance

## Objective

Provide a visual, accessible, deterministic way to compose the supported run
configuration without creating an unvalidated second scenario language.

## Implemented

- Versioned `aether-scenario-blueprint.v1` contract.
- Five explicit premise, population, time, intervention, and reproducibility
  nodes with four required edges.
- Fail-closed topology, scenario, numeric, and seed validation.
- Exact compilation to the existing browser runtime payload.
- Synchronized visual pipeline and node configuration form.
- Node focus navigation, live valid/error status, and disabled invalid actions.
- Canonical blueprint JSON export.
- Active-project configuration save when a blueprint is applied.

## Claim boundary

Only committed scenarios and the existing runtime configuration are supported.
Arbitrary graph shapes, scripts, plugins, and provider nodes are excluded.

## Verification contract

- Unit tests cover deterministic compilation, byte-stable export, exact node
  order, topology rejection, unknown scenario rejection, and input bounds.
- Browser acceptance covers node focus, valid and invalid states, blueprint
  export, exact compilation, lifecycle, accessibility, and compact widths.
- The complete repository release gate remains mandatory.

## Disposition

Implementation candidate. Protected continuous integration, review, merge,
deployment, and hosted acceptance are required before integration is recorded.
