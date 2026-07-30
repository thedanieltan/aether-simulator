# Unified citizen and entity model

## Purpose

The unified entity model is a read-only, deterministic view over the world
kernel. It gives every fictional citizen, household, organization, institution,
system, and asset one inspectable record shape without changing the underlying
depth-specific simulation state.

## Record contract

Each `aether-entity-record.v1` contains:

- the existing stable entity identifier;
- normalized entity type and original collection;
- fictional display label and depth-specific kind;
- synthetic and non-authoritative flags;
- original synthetic attributes;
- sorted relationship and identity contexts;
- event identifiers that refer to the entity;
- lineage fact identifiers that refer to the entity;
- world, scenario, and scenario-digest provenance.

The `aether-entity-index.v1` groups these records for one world and records
collection counts. It introduces no replacement identifiers.

## Citizen role contexts

- Enterprise people derive role and department from their declared worker
  attributes and employment relationship.
- Ecosystem shared citizens retain every independently emitted identity context,
  including household, employee, customer, director, and representative roles.
- Economy citizens retain household membership, employment-market, and other
  counterparty relationships emitted by the economy model.

One citizen can therefore be inspected in several contexts without being
duplicated into several people.

## Browser explorer

The Entities result view filters locally by text and entity collection. Its
master-detail record shows synthetic status, identity, context count, referenced
events, lineage count, counterpart labels, role, direction, status, and source
attributes.

This index is the entity foundation used by the semantic zoom projection. The
projection adds navigation but no replacement identity or inferred context.

## Boundary

The index accepts only a world whose provenance is explicitly synthetic and
non-authoritative. It never infers a real identity, resolves a person across
real datasets, or assigns an undeclared legal or organizational role.
