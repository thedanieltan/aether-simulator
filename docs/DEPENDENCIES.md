# Dependencies

## Production dependency

| Package | Pinned version | Purpose | Licence |
|---|---:|---|---|
| Ajv | 8.20.0 | Compile and enforce the versioned JSON Schema draft 2020-12 contracts | MIT |

Ajv is used instead of a partial local validator. Contract enforcement is a
security and reproducibility boundary: malformed inputs and unsupported
versions must fail closed. The version is exact in `package.json` and resolved
by `package-lock.json`.

Its locked transitive packages are `fast-deep-equal` 3.1.3 (MIT), `fast-uri`
3.1.4 (BSD-3-Clause), `json-schema-traverse` 1.0.0 (MIT), and
`require-from-string` 2.0.2 (MIT). These licences are compatible with the
repository's Apache-2.0 licence. The package lock is the dependency inventory;
contributors should review lockfile changes and run the canonical acceptance
command after any update.

The kernel has no network, database, provider SDK, telemetry, container, or
credential dependency.
