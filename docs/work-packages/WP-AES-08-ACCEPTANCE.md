# WP-AES-08 acceptance

## Objective

Define and expose one deterministic citizen and entity record model across
enterprise, ecosystem, and economy worlds.

## Implemented

- `aether-entity-record.v1` and `aether-entity-index.v1` read-only contracts.
- Stable reuse of kernel identifiers with no identity replacement layer.
- Normalized people, households, organizations, institutions, systems, and
  assets.
- Sorted relationship contexts, ecosystem identity contexts, event references,
  lineage references, and world provenance.
- Enterprise employment role and department context.
- Shared-citizen multi-role context across organizations and a household.
- Economy household and employment-market citizen contexts.
- Browser Entities view with local type and text filtering and inspectable
  synthetic source attributes.

## Claim boundary

The model is a deterministic view, not a new simulation engine or identity
resolver. All records are fictional, synthetic, and non-authoritative.
Graph-based semantic zoom remains WP-AES-12.

## Verification contract

- Unit tests cover full entity coverage and deterministic indexing at all three
  product depths.
- Focused tests cover enterprise employment, five shared-citizen contexts,
  economy household and employment contexts, identity lookup, and rejection of
  authoritative input.
- Browser acceptance covers citizen filtering, detail selection, visible
  synthetic boundary, lifecycle, accessibility, and compact widths.
- The complete repository release gate remains mandatory.

## Disposition

Integrated and live accepted on 2026-07-30.

- Protected pull request: `#11`.
- All five required acceptance, runtime, portability, and browser checks passed.
- Immutable deployment:
  `https://2a626224.aether-simulator.pages.dev`.
- Hosted acceptance: seven Playwright journeys passed, including citizen
  filtering, entity detail, role context, local project recovery, deterministic
  lifecycle, accessibility, and compact widths.
- The deployed response retained the restrictive security policy.

Semantic zoom remains outside this acceptance and is tracked separately.
