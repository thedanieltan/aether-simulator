# Contributing

Contributions must preserve deterministic replay, the synthetic-only boundary,
explicit provenance, non-authoritative output, and evidence quarantine.

Before submitting a change:

1. Use only fictional organizations, people, identifiers, and events.
2. Keep legal, regulatory, audit, and compliance conclusions out of generated
   facts.
3. Version contract changes and update formal schemas.
4. Register modules through `defineModule`; keep hooks deterministic and use
   namespaced random substreams.
5. Add acceptance tests for determinism, lifecycle operations, failure
   boundaries, fixtures, or migration as applicable.
6. Keep enterprise events causally linked and preserve balanced accounting,
   capacity, inventory, employment, invoice, workflow, and lineage invariants.
7. Document compatibility, migration, dependency, and research-status impact.
8. Run the same canonical command used by CI: `npm run verify:ci`.
9. For browser changes, run `npm run test:e2e` and preserve keyboard,
   responsive, reduced-motion, security-policy, and local-only boundaries.
10. Confirm the contribution is yours to license under Apache-2.0.

Do not add external credentials, provider account references, copied customer
records, real personal data, private URLs, local absolute paths, or generated
operational artifacts. New dependencies require a documented purpose, exact
version, licence review, and security consideration in `docs/DEPENDENCIES.md`.
