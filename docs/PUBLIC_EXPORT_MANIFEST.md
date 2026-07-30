# Public export manifest

This repository is an independently auditable public implementation without
private Git history. The manifest names only public paths needed by users and
reviewers.

| Retained capability | Public implementation or data | Verification |
|---|---|---|
| Canonical serialization | `src/canonical-json.mjs` | Determinism and fixture tests |
| Cryptographic identifiers and random namespaces | `src/kernel/ids.mjs` | Collision corpus and substream tests |
| Versioned contracts | `schemas/kernel/`, `src/kernel/contracts.mjs` | Formal schema validation |
| Scenario and semantic validation | `src/kernel/validation.mjs` | Invalid-input and version rejection tests |
| Clock and canonical event scheduling | `src/kernel/events.mjs`, `src/kernel/kernel.mjs` | Same-tick and replay tests |
| Module lifecycle | `src/kernel/module.mjs`, `src/modules/baseline-operations.mjs` | Registration-order tests |
| Event storage and projections | `src/kernel/projection.mjs` | Event/projection identity tests |
| Run, checkpoint/resume, replay, branch, compare | `src/kernel/kernel.mjs` | Kernel acceptance tests |
| v0.1 compatibility migration | `src/kernel/migration.mjs`, `fixtures/legacy-world-v0.1.migration.json` | Deterministic migration test |
| Stable package and CLI surfaces | `src/index.mjs`, `src/cli.mjs`, `package.json` | CLI lifecycle tests |
| Baseline scenario and intervention | `scenarios/kernel-baseline.json`, `scenarios/interventions/` | Scenario and branch tests |
| Canonical v1 artifacts | `fixtures/kernel-baseline.*.json` | Fixture validation and replay |
| Legacy public behavior | `src/generate.mjs`, `src/lineage.mjs`, `src/random.mjs`, `fixtures/world.seed-424242.json` | Pinned v0.1 tests |
| Optional evidence normalization | `packages/evidence-bridge/`, `fixtures/kernel-baseline.evidence.json` | Boundary, quarantine, and facts-only tests |
| Local demonstration | `scripts/demo.mjs` | Credential-free byte-identical run |
| Build, schemas, fixtures, policy, and scanning | `scripts/`, `.github/workflows/ci.yml` | Canonical `npm run verify` |
| CI/CD quality gate and dependency maintenance | `.github/workflows/ci.yml`, `.github/dependabot.yml`, `docs/CI_CD.md` | Canonical `npm run verify:ci` and workflow policy |
| Public research documentation | `README.md`, `docs/` | Public-tree policy |
| Enterprise configuration contract | `schemas/enterprise/`, `src/enterprise/validation.mjs` | Schema and fail-closed tests |
| Five enterprise archetypes | `src/enterprise/archetypes.mjs` | Material-difference tests |
| Enterprise scenario construction | `src/enterprise/scenario-builder.mjs` | Nine end-to-end scenarios |
| Enterprise event projections and invariants | `src/modules/enterprise-operations.mjs`, `src/enterprise/analysis.mjs` | Domain invariant tests |
| Enterprise scenarios and interventions | `scenarios/enterprise/`, `scenarios/interventions/enterprise-inventory-buffer.json` | Determinism and branch tests |
| Enterprise canonical fixtures | `fixtures/enterprise/` | Full-export, summary, checkpoint, branch, and comparison validation |
| Enterprise benchmarks | `scripts/benchmark-enterprise.mjs`, `docs/ENTERPRISE_BENCHMARKS.md` | Configurable scale profiles |
| Ecosystem configuration and event contracts | `schemas/ecosystem/`, `src/ecosystem/validation.mjs` | Formal schema and fail-closed tests |
| Ecosystem construction and shared-kernel composition | `src/ecosystem/scenario-builder.mjs`, `src/modules/ecosystem-operations.mjs` | Seven deterministic scenarios |
| Cross-boundary reconciliation and causal analysis | `src/ecosystem/analysis.mjs` | Contract, payment, delivery, identity, lineage, and cascade tests |
| Ecosystem scenarios, fixtures, and intervention | `scenarios/ecosystem/`, `fixtures/ecosystem/`, `scenarios/interventions/ecosystem-capacity-restoration.json` | Replay, branch, comparison, and fixture validation |
| Ecosystem benchmarks | `scripts/benchmark-ecosystem.mjs`, `docs/ECOSYSTEM_BENCHMARKS.md` | Configurable scale profiles |

Private repository identifiers, internal source locations, commit hashes,
branches, tags, authorship metadata, operational details, and private artifacts
are neither included nor required to use the public repository.
