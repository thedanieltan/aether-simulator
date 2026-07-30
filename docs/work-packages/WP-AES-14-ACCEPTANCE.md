# WP-AES-14 acceptance

## Objective

Make every committed browser scenario discoverable and provide a short,
reproducible first-run path.

## Implemented

- Versioned 16-entry scenario library.
- One source for displayed and executable scenario identifiers.
- Depth and text filtering with an honest empty state.
- Synthetic and research-preview metadata.
- Frozen guided enterprise configuration using the normal run workspace.
- Responsive, keyboard-operable library and guided controls.

## Verification contract

- Unit tests cover exact catalog counts, identifier uniqueness, filter
  behavior, synthetic status, and guided-config resolution.
- Browser acceptance covers catalog filtering, guided configuration, and a
  completed local run.
- The complete repository release gate remains mandatory.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#23`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://2df84918.aether-simulator.pages.dev`.
- Hosted acceptance: thirteen Playwright journeys passed, including library
  filtering, the guided run, and all previously accepted workflows.
