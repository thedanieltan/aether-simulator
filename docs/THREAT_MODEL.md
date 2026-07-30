# Browser product threat model

## Assets and trust boundaries

The protected assets are deterministic scenario inputs, generated synthetic
worlds, exported artifacts, dependency integrity, and the distinction between
research output and authoritative evidence. The browser, Web Worker, static
host, downloaded files, and repository dependency chain are separate trust
boundaries.

## In-scope threats and controls

| Threat | Control |
|---|---|
| Credential or personal-data ingestion | Project inputs are explicitly fictional; the project contract contains only metadata, bounded configuration, and an optional digest; no real-record schema, authentication, provider, or environment-variable surface exists |
| Network exfiltration | Runtime code has no fetch, socket, analytics, telemetry, or provider integration; content policy restricts connections to the same origin |
| Main-thread denial of service | Simulation executes in a Web Worker; scale remains explicit and user-controlled |
| Cross-site script injection | No user HTML rendering; text uses DOM `textContent`; page scripts and styles are same-origin only |
| Artifact ambiguity | Every export declares synthetic, non-authoritative provenance; evidence output starts quarantined |
| Non-deterministic replay | Browser parity tests compare canonical exports and digests for identical inputs |
| Dependency or workflow drift | Exact dependency versions, lockfile installs, read-only CI, full-SHA action pins, audits, and automated update proposals |
| Malicious project material | Imports are capped at 20 MB, parsed as JSON, normalized through an exact allowlist, rendered with `textContent`, and limited to committed scenario identifiers |
| Local persistence exposure | Projects remain in browser storage; users are warned not to enter sensitive data and can explicitly delete or export each project |

## Residual risks

A hostile browser extension or compromised host can observe page content and
downloads. Very large user-selected scales can exhaust local memory or CPU.
Project names and descriptions are user-entered and cannot be proven fictional;
a user who ignores the visible boundary can place sensitive text in local
browser storage or an exported project file.
Static hosting does not make the simulator production-ready. Content policy
headers depend on the selected host honoring the committed header file.

Ajv validators are compiled into a committed standalone module during
development. CI rejects validator drift. The hosted application therefore
preserves strict content policy without dynamic evaluation in either the page
or its worker.

No connected-provider, multi-user authorization, confidential-data processing,
or operational availability claim is in scope.
