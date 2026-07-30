# Reliability and packaging

## Browser recovery

Every worker request listens for a result, progress messages, worker errors,
message-decoding errors, and abort. Settling any terminal condition removes all
listeners. Cancellation terminates the worker instead of waiting for the
synchronous kernel to yield.

**Reset local worker** explicitly discards the transient simulation session and
creates a fresh worker. It does not delete IndexedDB projects. A saved project
can be reopened and its last digest reverified by a new run.

## Portability

| Surface | Accepted environment |
|---|---|
| Minimum runtime and full acceptance | Node.js 20 on Linux |
| Current runtimes | Node.js 22 and 24 on Linux |
| Cross-platform repository behavior | Node.js 20 on Windows |
| Browser product | Current pinned Playwright Chromium |
| Static distribution | Vite ES2022 build with no source maps |

The browser product requires modern Web Worker, IndexedDB, structured-clone,
and Web Crypto support. Other browser engines are not yet live accepted.

## Release package boundary

`npm run verify:package` inspects the exact `npm pack --dry-run --json` manifest.
It requires the CLI, library entry point, schemas, scenarios, browser product,
runtime control, semantic zoom, analysis, scenario library, licence, privacy
boundary, and product requirements.

The package rejects tests, scripts, CI configuration, dependencies, build
output, test output, deployment state, environment files, databases, dumps,
logs, and temporary files. The static hosting artifact remains the separately
verified `dist/` build.

