# Local project workspace

## Purpose

A project keeps a simulation configuration and the digest of its last completed
run in the current browser. It provides continuity without an account, server,
credential, or network provider.

## Project contract

Project files use `aether-project.v1` and contain:

- a locally generated project identifier;
- a user-supplied fictional name and optional description;
- a positive revision number;
- product depth, committed scenario identifier, seed, scale, duration, and
  intervention configuration;
- optionally, the SHA-256 digest and project revision of the last completed
  run.

The project file does not embed a world artifact or arbitrary scenario content.
World, event, comparison, and evidence artifacts remain separate explicit
downloads.

## Storage and recovery

Projects are stored in browser IndexedDB. The active project identifier is
stored in local browser storage. On reload, Aether validates the project,
re-runs its committed scenario locally, and accepts the recovered result only
when its digest matches the recorded digest. A mismatch fails closed and asks
the user to run the project again.

Deleting a project removes it from the current browser and cannot be undone.
Export a project file first when a portable copy is required.

## Import boundary

Imports are local, size-limited to 20 MB, parsed as JSON, validated against an
exact allowlist, and rendered only as text. Unsupported contracts, scenarios,
depths, numeric ranges, identifiers, and run digests are rejected. Unknown
fields are discarded during normalization.

Imported content is never transmitted. Users must use fictional project names
and descriptions and must not enter real personal, confidential, credential,
or provider data.

## Determinism

Project identifiers and revision numbers are workspace metadata, not simulation
inputs. A project file is byte-identical when its validated content is
unchanged. Simulation determinism continues to depend on the supported
simulator version, scenario, configuration, and seed.
