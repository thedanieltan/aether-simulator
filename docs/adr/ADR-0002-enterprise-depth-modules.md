# ADR-0002: Enterprise Depth as shared-kernel modules and scenarios

- Status: accepted for research preview
- Date: 2026-07-28

## Context

Enterprise Depth needs configurable stateful organizations without duplicating
the WP-AES-01 kernel or presenting external counterparties as a completed
ecosystem.

## Decision

Represent enterprise configuration with `aether-enterprise-config.v1`. Resolve
it through deterministic archetype definitions into ordinary
`aether-scenario.v1` input. Execute all behavior through one
`enterprise-operations` module registered with the shared kernel.

Use append-only events and a module projection for workflows, journals,
inventory, capacity, employment, invoices, payments, records, incidents,
outcomes, and causal steps. Emit balance, metric, and lineage updates through
core events. Enforce domain invariants while reducing events.

Model customers and suppliers as explicit non-simulated boundary contexts.
Independent organizations and cross-boundary mutation remain future Ecosystem
Depth.

## Consequences

Kernel replay, checkpoint/resume, branching, ordering, provenance, and
canonical export apply unchanged. Archetypes remain independently testable,
and invalid domain transitions fail closed.

The model is intentionally simplified. It does not implement tax, provider
settlement, legal conclusions, calibrated forecasts, or cross-enterprise
private state. Larger scale increases host resource use; no arbitrary product
cap is imposed.
