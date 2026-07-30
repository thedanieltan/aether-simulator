# WP-AES-05 acceptance

## Objective

Deliver an independently usable public browser product over the accepted Aether
kernel, with local worker execution, deterministic lifecycle controls,
inspection and export views, accessibility, static-host security, CI coverage,
and an honest research boundary.

## Implemented

- Static Vite build with locally bundled fonts and no runtime credentials.
- Scenario gallery and configuration for all three implemented product depths.
- Web Worker execution through the existing builders, kernel, and modules.
- Run, checkpoint/pause, resume, replay, cancel, branch, and compare controls.
- Entity graph, causal timeline, state inspector, lineage, and export views.
- Canonical world artifacts plus quarantined, non-authoritative browser evidence
  envelopes.
- Responsive keyboard-operable interface, command palette, reduced-motion
  handling, security headers, and threat-model documentation.
- Dedicated Chromium CI acceptance in addition to the canonical Node and
  Windows quality gates.

## Verification contract

Local acceptance requires:

```bash
npm run verify:ci
npm run test:e2e
```

The Node suite includes browser-runtime state and byte-parity tests. Playwright
exercises run, inspect, checkpoint, replay equality, branch, compare, export,
command-palette, lineage, Axe WCAG A/AA rules, and responsive widths of 320,
375, 414, and 768 pixels.

## States

- **Implemented:** complete on the work-package branch.
- **Integrated:** complete through protected pull-request review and required
  checks.
- **Deployed:** static research build deployed to the documented public target.
- **Live accepted:** complete for the local-only browser lifecycle on an
  immutable hosted deployment dated 2026-07-30.
- **Operational:** not claimed; this remains research software without a
  service-level commitment.

## Known limitations

The worker runs the deterministic kernel synchronously. Pause creates a
checkpoint at the current completed state rather than interrupting a reducer.
No uploads, authentication, collaboration, provider connections, server
persistence, or connected calibration are included. Automated accessibility
checks do not replace broader manual assistive-technology review.
Ajv validators are generated at build-development time and committed as a
standalone module. CI verifies that generated validators match the ten source
contracts, so the hosted page and worker both prohibit dynamic evaluation.
