# WP-AES-15 acceptance

## Objective

Harden browser failure recovery, portability evidence, and the redistributable
package boundary.

## Implemented

- Fail-fast worker error and message-error handling.
- Listener cleanup across success, failure, and abort.
- Explicit local-worker reset without deleting saved projects.
- Required public product surfaces in package verification.
- Expanded forbidden transient and repository-only package surfaces.
- Documented Node, Windows, Chromium, and static-build support matrix.

## Verification contract

- Unit tests cover progress, result, abort, crash, and unreadable-message paths.
- Browser acceptance covers cancellation, worker replacement, reset, and
  visible recovery state.
- Package inspection uses the exact npm dry-run manifest.
- Protected CI covers Node 20, 22, 24, Windows, and Chromium.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#25`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://85a82a63.aether-simulator.pages.dev`.
- Hosted acceptance: thirteen Playwright journeys passed, including worker
  reset and all previously accepted workflows.
