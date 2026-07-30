# WP-AES-07 acceptance

## Objective

Provide a private-by-default local project lifecycle so a user can retain,
recover, move, and delete simulation work without an account or server.

## Implemented

- Versioned `aether-project.v1` document with strict validation and canonical
  serialization.
- IndexedDB repository for create, list, open, revise, and delete operations.
- Active-project recovery through local browser metadata.
- Automatic configuration persistence and last-run digest recording.
- Deterministic digest verification when restoring a completed run.
- Local project-file import and export with size, shape, scenario, numeric, and
  digest validation.
- Visible empty, loading, success, error, active, and unavailable states.
- Project context in the product header and a stable `#/projects` route.

## Claim boundary

The workspace is single-browser and single-user. It has no server sync,
collaboration, authentication, authorization, telemetry, or connected data
source. Project names and descriptions are user-entered local text; users are
instructed to keep them fictional and non-sensitive. Project files do not
contain world artifacts.

## Verification contract

- Unit tests cover byte-identical project serialization, revision identity,
  validation failures, and run-digest restoration.
- Browser acceptance covers create, configuration save, run, reload, digest
  recovery, rename, export, delete, and import.
- Existing lifecycle, accessibility, compact-width, public-tree, fixture,
  dependency, and sensitive-content checks remain mandatory.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#9`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://e3f1a871.aether-simulator.pages.dev`.
- Hosted acceptance: seven Playwright journeys passed, including the complete
  project create, save, run, reload, digest recovery, rename, export, delete,
  and import round trip.
- The deployed response retained the restrictive security policy.

This acceptance covers local single-browser projects only. Server sync,
collaboration, accounts, and external integrations remain outside scope.
