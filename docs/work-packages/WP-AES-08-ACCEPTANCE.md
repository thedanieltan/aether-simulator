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

Implementation candidate. Protected continuous integration, review, merge,
deployment, and hosted acceptance are required before integration is recorded.
