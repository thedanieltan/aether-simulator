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

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#13`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://6d4d4576.aether-simulator.pages.dev`.
- Hosted acceptance: eight Playwright journeys passed, including blueprint
  validation, invalid-state gating, export, exact run compilation, projects,
  entity inspection, deterministic lifecycle, accessibility, and compact
  widths.
- The deployed response retained the restrictive security policy.

Arbitrary executable graph nodes remain outside this acceptance.
