# Semantic zoom

Semantic zoom provides a deterministic path from a completed synthetic world
to one organization and then to the citizens with a declared context inside
that organization.

## Projection contract

`aether-semantic-zoom.v1` contains:

- the world and scenario identifiers;
- sorted organization summaries;
- stable citizen identifiers connected to each organization;
- deterministic world, enterprise, and citizen paths;
- the existing unified entity records used for detail;
- explicit synthetic and non-authoritative flags.

Connections come only from kernel relationships and emitted identity contexts.
The projection does not interpret arbitrary matching attributes.

## Browser workflow

1. Run an Enterprise, Ecosystem, or Economy Depth scenario.
2. Open **Semantic zoom**.
3. Select an organization at world level.
4. Select a visible fictional citizen.
5. Inspect the citizen's context inside that organization, then its complete
   unified record, events, lineage count, provenance, and source attributes.
6. Use the breadcrumb to return to the organization or world.

An organization with no declared citizen context remains visible and shows an
honest empty state.

## Identity boundary

One citizen can appear under several organizations, especially in ecosystem
scenarios, but always retains one stable kernel identifier and one unified
record. The view does not resolve real people, infer undeclared employment, or
claim that a synthetic relationship exists outside the simulated world.

