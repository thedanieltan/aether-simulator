# Dependencies

## Production dependencies

| Package | Pinned version | Purpose | Licence |
|---|---:|---|---|
| Ajv | 8.20.0 | Compile and enforce the versioned JSON Schema draft 2020-12 contracts | MIT |
| @noble/hashes | 2.2.0 | Browser-portable SHA-256 identifiers and digests | MIT |

Ajv is used instead of a partial local validator. Contract enforcement is a
security and reproducibility boundary: malformed inputs and unsupported
versions must fail closed. The version is exact in `package.json` and resolved
by `package-lock.json`. Its standalone generator produces
`src/validation/standalone.mjs`; CI verifies that this module has not drifted
from the ten source schemas. Runtime validation therefore requires no dynamic
function generation.

Its locked transitive packages are `fast-deep-equal` 3.1.3 (MIT), `fast-uri`
3.1.4 (BSD-3-Clause), `json-schema-traverse` 1.0.0 (MIT), and
`require-from-string` 2.0.2 (MIT). These licences are compatible with the
repository's Apache-2.0 licence. The package lock is the dependency inventory;
contributors should review lockfile changes and run the canonical acceptance
command after any update.

## Development and browser-build dependencies

| Package | Pinned version | Purpose | Licence |
|---|---:|---|---|
| Vite | 8.1.5 | Static browser build | MIT |
| esbuild | 0.28.1 | Audited optional Vite transform peer pinned above the affected release range | MIT |
| Playwright Test | 1.62.0 | Chromium journey and responsive acceptance | Apache-2.0 |
| Axe Core | 4.12.1 | Automated WCAG A/AA analysis | MPL-2.0 |
| Fontsource Inter | 5.3.0 | Local body-font assets | OFL-1.1 |
| Fontsource Space Grotesk | 5.3.0 | Local display-font assets | OFL-1.1 |
| Fontsource JetBrains Mono | 5.3.0 | Local data-font assets | OFL-1.1 |

The MPL-2.0 obligation is file-scoped and applies to Axe Core itself; the
package is used only as a development test dependency and is not bundled into
the deployed product. Font files retain their OFL-1.1 terms. Normal source
distribution preserves package metadata and the lockfile; redistribution of
dependency or font source must preserve applicable notices.

The kernel has no network, database, provider SDK, telemetry, container, or
credential dependency. The optional deployment command invokes an exact
Wrangler 4.115.0 release through `npx`; it is not installed, bundled, imported,
or needed for build and test. Deployment requires Node.js 22 or newer.
