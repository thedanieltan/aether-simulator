# Aether Simulator

Aether is research software for building deterministic, fictional enterprise
worlds. It supports reproducible simulation, testing, and research. It is not
production-ready, live accepted, a compliance product, or a legal or regulatory
authority.

## Product-depth thesis

1. **Enterprise depth** - one realistic synthetic enterprise.
2. **Ecosystem depth** - enterprises interacting with customers, vendors,
   workers, institutions, and service providers.
3. **Economy depth** - many enterprises and citizens interacting through
   employment, consumption, supply chains, finance, taxation, regulation,
   business formation, failure, and shocks.

This repository implements the deterministic world kernel and configurable
Enterprise Depth research scenarios. Ecosystem and economy depth are not
implemented.

## What is implemented

- Versioned JSON contracts for scenarios, events, worlds, checkpoints, and
  exports.
- A deterministic clock, stable event scheduler, cryptographic identifiers,
  and namespaced random substreams.
- Deterministic module lifecycle hooks, append-only events, projections,
  replay, checkpoint/resume, branching, and comparison.
- Five enterprise archetypes: professional services, SaaS, retail, logistics,
  and manufacturing.
- Stateful customer, employee, procurement, fulfilment, finance, data-lineage,
  incident, remediation, and intervention journeys.
- Enforced accounting, inventory, capacity, payroll, invoice, workflow, and
  lineage invariants.
- Deterministic migration from the public `aether-world.v0.1` fixture.
- An optional evidence bridge that converts synthetic lineage observations into
  quarantined, facts-only, non-authoritative envelopes.

Cross-enterprise ecosystems, economy behavior, local OSS realism, and connected
calibration remain future research. External customer and supplier entries in
Enterprise Depth are boundary contexts, not independently simulated
organizations. Connected-provider performance is not universally validated.

## Five-minute demonstration

Requires Node.js 20 or newer. Docker, credentials, and network services are not
required.

```bash
npm ci
npm run demo
npm run demo:enterprise
npm run verify
```

The demonstration writes `fixtures/kernel-baseline.export.json` and
`fixtures/kernel-baseline.evidence.json`. Re-running it with the same scenario,
contract version, and seed produces byte-identical output.

The CLI can also run individual lifecycle operations:

```bash
node src/cli.mjs validate scenarios/kernel-baseline.json
node src/cli.mjs run scenarios/kernel-baseline.json
node src/cli.mjs checkpoint scenarios/kernel-baseline.json --tick 2
node src/cli.mjs enterprise-run scenarios/enterprise/retail-order-to-cash.json
```

Run `node src/cli.mjs help` for replay, branch, compare, and migrate examples.

## Architecture

```mermaid
flowchart LR
  Config["Enterprise config + archetype"] --> Builder["Scenario builder"]
  Builder --> Scenario["Validated scenario + root seed"]
  Scenario --> Kernel["Deterministic world kernel"]
  Module["Enterprise operations module"] --> Kernel
  Kernel --> Events["Canonical append-only event log"]
  Events --> Projection["Projected world state"]
  Projection --> Export["Versioned canonical export"]
  Events --> Checkpoint["Checkpoint / resume / replay"]
  Checkpoint --> Branch["Branch and compare"]
  Export --> Bridge["Optional evidence bridge"]
  Bridge --> Evidence["Quarantined non-authoritative envelopes"]
```

## Privacy and limitations

The committed scenarios and fixtures contain only fictional identifiers and
synthetic records. No real personal data is included or accepted by the
demonstration. Synthetic output does not establish real-world compliance.
Provider-connected execution is not included. Enterprise models are explicit,
simplified research assumptions rather than calibrated digital twins.

Repository status: **active research**.

See [architecture](docs/ARCHITECTURE.md),
[research status](docs/RESEARCH_STATUS.md), and the
[public export manifest](docs/PUBLIC_EXPORT_MANIFEST.md).
