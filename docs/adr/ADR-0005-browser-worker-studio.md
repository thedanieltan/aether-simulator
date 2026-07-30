# ADR-0005: Static browser studio with a Web Worker

Status: accepted

## Context

Researchers need a public product surface that demonstrates the simulator
without credentials or private infrastructure while preserving the canonical
kernel’s deterministic behavior.

## Decision

Build a framework-light static application with Vite. Execute the existing
kernel, scenario builders, and depth modules in a module Web Worker. Keep
browser-specific orchestration and export adaptation in `app/`; do not create a
second simulation engine. Host only static artifacts and prohibit runtime
provider connections.

Use locally packaged fonts, same-origin security policy, semantic controls,
Playwright journey tests, Axe accessibility checks, and byte-parity tests
against direct kernel execution.

## Consequences

The main thread remains responsive and the product can run on ordinary static
hosting. Scenario behavior remains governed by the public kernel and contracts.
Browser bundles are larger than a bespoke demonstration because they contain
the real validation and simulation modules.

Kernel execution is currently synchronous inside the worker. Pause therefore
materializes a deterministic checkpoint rather than pre-empting an event
reducer. Worker-parallel partition execution, uploads, authentication, connected
calibration, and multi-user persistence remain outside this decision.

