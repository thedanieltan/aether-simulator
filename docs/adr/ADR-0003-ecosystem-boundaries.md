# ADR-0003: Contract-gated ecosystem boundaries

- Status: accepted for research preview
- Date: 2026-07-30

## Context

Ecosystem Depth needs multiple independently simulated organizations without
allowing one module to mutate another organization's private state implicitly.
It must reuse the world kernel and Enterprise Depth structures.

## Decision

Build versioned ecosystem configurations into ordinary
`aether-scenario.v1` input. Register both `enterprise-operations` and
`ecosystem-operations` on the same kernel. Resolve organizational structure
from the existing enterprise archetype catalog.

Require every cross-boundary event to identify its owning organization,
affected organizations, and active contract. Reject unknown parties, missing
contracts, uncovered parties, unbalanced payments, and incomplete deliveries.
Represent shared citizens with one stable person identifier and separate
context records.

## Consequences

Kernel ordering, replay, checkpoints, branching, provenance, and canonical
exports remain unchanged. Cascade steps are queryable across organizations.
Cross-boundary facts remain synthetic and non-authoritative.

The model uses simplified multiparty contracts and deterministic numeric
effects. It is not a provider settlement system, legal interpretation, or
calibrated risk model.
