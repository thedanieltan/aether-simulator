# ADR-0001: Deterministic event-sourced world kernel

- Status: accepted for research preview
- Date: 2026-07-28

## Context

The original public demonstration generated one fixed enterprise-shaped
artifact. Later research needs a generalized foundation without claiming that
complete enterprise, ecosystem, or economy behavior already exists. The
foundation must be deterministic, auditable, synthetic-only, extensible, and
able to preserve the public v0.1 fixture through migration.

## Decision

Use a single-threaded, discrete-tick, event-sourced kernel with:

- JSON Schema versioned contracts;
- canonical same-tick ordering;
- SHA-256-derived stable identifiers and random namespaces;
- sorted module registration with deterministic lifecycle hooks;
- an append-only event log and deterministic projections;
- authenticated checkpoints, resume, replay, branch, and comparison;
- canonical JSON exports;
- explicit migration from `aether-world.v0.1`.

Use Ajv 8.20.0 for standards-based schema validation. Keep the legacy generator
as a compatibility input, but expose the cryptographic identifier and v1 kernel
as the primary package API.

## Consequences

The same declared inputs can be reproduced byte-for-byte without network,
clock, provider, or credential inputs. Modules must express changes as events
and cannot depend on registration order or shared random consumption.

Event logs and checkpoints can grow with the scenario. No arbitrary product cap
is imposed, but larger-world storage, partitioning, and performance research
remain future work. Contract evolution requires explicit new schemas and
migrations. The baseline scenario proves kernel behavior, not later product
depths or real-world validity.

## Alternatives considered

- Expanding the fixed generator was rejected because it would entangle world
  construction with domain behavior and lifecycle operations.
- A mutable-state-only engine was rejected because replay, provenance, and
  branch history would be weaker.
- A custom partial schema validator was rejected because incomplete contract
  enforcement would undermine fail-closed behavior.
- Connected services were rejected for the deterministic baseline because they
  add credentials, nondeterminism, and provider authority risks.
