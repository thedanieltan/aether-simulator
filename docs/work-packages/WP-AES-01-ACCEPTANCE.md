# WP-AES-01 acceptance record

## Objective and scope

Replace the fixed public-fixture foundation with a generalized deterministic
world kernel while preserving the synthetic-only, non-authoritative boundary.
Later enterprise, ecosystem, economy, partitioning, connected execution, and
browser-product work is excluded.

## Delivered

- Versioned world, scenario, event, checkpoint, and export contracts.
- Formal draft 2020-12 schema validation plus semantic validation.
- Deterministic clock, canonical scheduler, cryptographic IDs, and isolated
  random substreams.
- Sorted module lifecycle, append-only events, core/module projections.
- Run, replay, checkpoint/resume, branch, compare, and migrate operations.
- Stable package exports and a command-line interface.
- Deterministic v0.1 compatibility migration and committed fixtures.
- Canonical local/CI acceptance, public-tree policy, and content scanning.
- Architecture, dependency, migration, contribution, ADR, and status records.

## Acceptance evidence

The Node test suite proves:

- byte-identical same-input events, projections, checkpoints, and exports;
- different-seed divergence;
- module registration-order independence;
- replay and checkpoint-resume equivalence;
- shared branch history and isolated intervention effects;
- fail-closed invalid and unsupported contracts;
- zero collisions in a deterministic 50,000-identifier corpus;
- namespace-isolated random streams;
- deterministic v0.1 migration;
- facts-only, synthetic, non-authoritative evidence normalization.

The canonical command is:

```bash
npm run verify
```

It performs syntax/build checks, all tests, schema validation, fixture
validation, public-tree verification, and sensitive-content scanning. GitHub CI
installs from the lockfile and invokes this same command.

## Compatibility

The public v0.1 generator and fixtures remain reproducible. The v1 kernel is the
primary API; migration is explicit and deterministic. No private history or
source is part of the implementation.

## Status

- Implementation: complete.
- Integration: complete through protected pull-request review and required
  checks.
- Deployment: the kernel is included in the static browser research build
  delivered by WP-AES-05.
- Live acceptance: complete only through the WP-AES-05 browser lifecycle; the
  command-line and library interfaces are not separate live services.
- Product depth: enterprise, ecosystem, and economy research models were
  subsequently implemented by WP-AES-02 through WP-AES-04.
