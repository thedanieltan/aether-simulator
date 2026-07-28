# Migrating public v0.1 world fixtures

The v0.1 fixture generator remains available for compatibility. The primary
kernel uses v1 scenario, event, world, checkpoint, and export contracts.

Migrate a v0.1 world with:

```bash
node src/cli.mjs migrate fixtures/world.seed-424242.json --output migrated.json
```

The migration validates the legacy contract, preserves its synthetic and
non-authoritative boundary, converts its entities, workflow records, and
lineage facts into the generalized world collections, and emits a v1 scenario
plus canonical export. The same legacy input always produces the same migrated
artifact.

Migration does not infer omitted real-world facts, grant authority, or upgrade
the bounded fixture into complete enterprise depth. Consumers should pin the
contract version they accept and fail closed for unknown versions.
