import { createHash } from "node:crypto";

function stableEnvelopeId(record) {
  const digest = createHash("sha256")
    .update(record.record_id)
    .digest("hex")
    .slice(0, 16);
  return `evidence-${digest}`;
}

function unwrapWorld(value) {
  return value?.contract_version === "aether-export.v1" ? value.world : value;
}

function lineageRecords(world) {
  if (world.contract_version === "aether-world.v0.1") {
    return world.pii_lineage.records;
  }
  return world.observations
    .filter((observation) => observation.kind === "pii-lineage")
    .map((observation) => ({
      record_id: observation.id,
      data_subject_id: observation.attributes.subject_ref,
      system_id: observation.attributes.system_ref,
      created_at_simulation_tick: observation.attributes.simulation_tick,
      copied_from: observation.attributes.copied_from,
      transformed_by: observation.attributes.transformed_by,
    }));
}

export function validateWorldFixture(value) {
  const world = unwrapWorld(value);
  const errors = [];
  if (!["aether-world.v0.1", "aether-world.v1"].includes(world?.contract_version)) {
    errors.push("unsupported contract_version");
  }
  if (world?.provenance?.tier !== "synthetic") {
    errors.push("only synthetic provenance is accepted");
  }
  if (
    world?.contract_version === "aether-world.v0.1" &&
    world?.company?.fictional !== true
  ) {
    errors.push("company must be explicitly fictional");
  }
  if (
    world?.contract_version === "aether-world.v1" &&
    world?.provenance?.authoritative !== false
  ) {
    errors.push("world must be explicitly non-authoritative");
  }
  if (
    world?.contract_version === "aether-world.v0.1" &&
    !Array.isArray(world?.pii_lineage?.records)
  ) {
    errors.push("pii_lineage.records must be an array");
  }
  if (
    world?.contract_version === "aether-world.v1" &&
    !Array.isArray(world?.observations)
  ) {
    errors.push("observations must be an array");
  }
  return { valid: errors.length === 0, errors };
}

export function normalizeWorldEvidence(value) {
  const validation = validateWorldFixture(value);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join("; "));
  }
  const world = unwrapWorld(value);
  const records = lineageRecords(world);
  const worldReference = world.world_ref ?? world.world_id;

  return {
    schema_version: "aether-evidence-bundle.v1",
    authority: "research-only",
    release_state: "quarantined",
    source_world_ref: worldReference,
    envelopes: records.map((record) => ({
      envelope_id: stableEnvelopeId(record),
      schema_version: "evidence-envelope.v1",
      source_record_ref: record.record_id,
      origin_mode: "deterministic_synthetic",
      transformation_stage: "world_to_normalized_evidence",
      transformation_version: "evidence-bridge.v0.1",
      custody: "local_research_fixture",
      simulation_tick: record.created_at_simulation_tick,
      subject_refs: [record.data_subject_id],
      system_refs: [record.system_id],
      verification_status: "derived",
      contradictions: [],
      limitations: [
        "synthetic fact only",
        "does not establish a legal, regulatory, or compliance conclusion",
      ],
      redaction_state: "synthetic_identifiers_only",
      promotion_state: "quarantined",
      provenance: {
        tier: "synthetic",
        copied_from: record.copied_from ?? null,
        transformed_by: record.transformed_by ?? null,
      },
    })),
  };
}

export function promoteEvidence(bundle, reviewReference) {
  if (bundle.release_state !== "quarantined") {
    throw new Error("only quarantined evidence can be promoted");
  }
  if (!/^review-[a-z0-9-]+$/.test(reviewReference)) {
    throw new TypeError("reviewReference must be a non-sensitive synthetic review id");
  }
  return {
    ...bundle,
    release_state: "reviewed",
    review_reference: reviewReference,
    envelopes: bundle.envelopes.map((envelope) => ({
      ...envelope,
      promotion_state: "reviewed",
    })),
  };
}
