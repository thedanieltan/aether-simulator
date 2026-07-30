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

Implemented locally on the work-package branch. Protected integration,
deployment, and hosted acceptance must be recorded before this package is
classified as live accepted.

