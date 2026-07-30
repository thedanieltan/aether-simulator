# WP-AES-06 acceptance

## Objective

Establish the standalone product foundation: a stable product name, explicit
requirements, coherent information architecture, navigable browser shell, and
tested deep-link contract.

## Accepted scope

- Product requirements and 1.0 work-package boundaries are public.
- The browser app is titled **Aether Enterprise Simulator**.
- One route registry drives the product rail, orientation index, command
  navigator, deep links, and active-route state.
- Overview, scenario design, run, explore, compare, export, and research
  boundary destinations have honest availability labels.
- Existing deterministic run, inspection, lifecycle, and download behavior is
  retained.
- Compact layouts keep the command navigator and product context without
  horizontal overflow.

## Claim boundary

WP-AES-06 does not claim project persistence, visual model construction,
semantic zoom, large-scale runtime management, advanced analysis, or external
integration. Those remain separately testable work packages. A gated action
requires an actual completed run.

## Verification contract

- Route parser and state reducer tests cover valid, nested, unknown, and
  availability-preserving transitions.
- Browser tests cover direct route loading, navigation, command navigation,
  deterministic execution, accessibility, and 320, 375, 414, and 768 pixel
  widths.
- The standard repository build, fixture, policy, dependency, sensitive
  content, and browser checks remain required.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#7`.
- Required checks: acceptance on Node.js 20, runtime on Node.js 22 and 24,
  Windows portability, and Chromium browser studio all passed.
- Immutable deployment:
  `https://8d747300.aether-simulator.pages.dev`.
- Hosted acceptance: six Playwright journeys passed, covering deterministic
  lifecycle behavior, route navigation, Axe accessibility, and 320, 375, 414,
  and 768 pixel widths.
- Response policy: restrictive content, permission, referrer, framing, and
  MIME-sniffing headers were present.

This acceptance covers the local deterministic browser product only. Planned
standalone product work and all external integrations remain outside this
acceptance boundary.
