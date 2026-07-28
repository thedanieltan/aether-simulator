import { fnv1a, stableId } from "./random.mjs";

const fieldsByContext = {
  "employee:people": [
    ["synthetic_name", "identifier"],
    ["worker_reference", "identifier"],
    ["role_reference", "employment"],
  ],
  "employee:finance": [
    ["payment_account_reference", "financial"],
    ["synthetic_compensation", "employment"],
  ],
  "customer:sales": [
    ["synthetic_name", "identifier"],
    ["customer_reference", "identifier"],
  ],
  "customer:finance": [
    ["billing_reference", "financial"],
  ],
  "application_user:product": [
    ["device_reference", "device"],
    ["network_address_field", "identifier"],
  ],
  "support_requester:support": [
    ["requester_reference", "identifier"],
    ["attachment_reference", "content"],
  ],
};

const accessBySurface = {
  people: ["role-people-operations"],
  finance: ["role-finance-operations"],
  sales: ["role-sales-operations"],
  product: ["role-product-analyst"],
  support: ["role-support-specialist"],
  security: ["role-security-operations"],
};

const copyRules = [
  ["people", "security", "worker_reference", "directory-sync"],
  ["sales", "finance", "customer_reference", "billing-sync"],
];

export function buildLineage(worldRef, people, systems, simulationTick) {
  const records = [];
  const citizens = [];
  const systemsBySurface = new Map();

  for (const system of systems) {
    systemsBySurface.set(system.surface, [
      ...(systemsBySurface.get(system.surface) ?? []),
      system,
    ]);
  }

  for (const person of people) {
    const contexts =
      person.kind === "employee"
        ? ["employee"]
        : ["customer", "application_user", "support_requester"];
    citizens.push({
      citizen_id: person.id,
      data_subject_id: person.subject_id,
      role_contexts: contexts,
      provenance_tier: "synthetic",
    });

    for (const context of contexts) {
      for (const [key, fields] of Object.entries(fieldsByContext)) {
        const [recordContext, surface] = key.split(":");
        if (recordContext !== context) continue;
        const candidates = systemsBySurface.get(surface) ?? [];
        if (candidates.length === 0) continue;
        const system =
          candidates[fnv1a(`${worldRef}:${person.id}:${key}`) % candidates.length];
        const recordId = stableId(
          "lineage",
          `${worldRef}:${person.id}:${system.id}:${context}`,
        );
        records.push({
          record_id: recordId,
          citizen_id: person.id,
          data_subject_id: person.subject_id,
          role_context: context,
          system_id: system.id,
          system_surface: surface,
          fields: fields.map(([fieldPath, category]) => ({
            field_path: fieldPath,
            data_category: category,
          })),
          access_role_ids: accessBySurface[surface] ?? [],
          created_at_simulation_tick: simulationTick,
          retention_state:
            surface === "finance" &&
            fnv1a(`${worldRef}:${recordId}:retention`) % 4 === 0
              ? "hold"
              : "active",
          provenance_tier: "synthetic",
        });
      }
    }
  }

  for (const citizen of citizens) {
    for (const [from, to, fieldPath, mechanism] of copyRules) {
      const source = records.find(
        (record) =>
          record.citizen_id === citizen.citizen_id &&
          record.system_surface === from &&
          record.copied_from === undefined,
      );
      const targets = systemsBySurface.get(to) ?? [];
      if (!source || targets.length === 0) continue;
      const target =
        targets[fnv1a(`${worldRef}:${citizen.citizen_id}:${mechanism}`) % targets.length];
      records.push({
        record_id: stableId(
          "lineage-copy",
          `${worldRef}:${citizen.citizen_id}:${target.id}:${mechanism}`,
        ),
        citizen_id: citizen.citizen_id,
        data_subject_id: citizen.data_subject_id,
        role_context: source.role_context,
        system_id: target.id,
        system_surface: to,
        fields: [{ field_path: fieldPath, data_category: "identifier" }],
        access_role_ids: accessBySurface[to] ?? [],
        created_at_simulation_tick: simulationTick,
        retention_state: source.retention_state,
        copied_from: source.record_id,
        transformed_by: mechanism,
        provenance_tier: "synthetic",
      });
    }
  }

  return {
    seed_ref: worldRef,
    citizens: citizens.sort((left, right) =>
      left.citizen_id.localeCompare(right.citizen_id),
    ),
    records: records.sort((left, right) =>
      left.record_id.localeCompare(right.record_id),
    ),
  };
}
