import { canonicalCompactJson } from "../canonical-json.mjs";
import { getEnterpriseArchetype } from "../enterprise/archetypes.mjs";
import { stableId } from "../kernel/ids.mjs";
import { assertEcosystemConfig } from "./validation.mjs";

const templates = {
  "saas-service-network": {
    organizations: [
      ["software-company", "saas"],
      ["payment-provider", "professional-services"],
      ["customer-enterprise", "retail"],
      ["support-vendor", "professional-services"],
    ],
    relationship_kinds: ["service-provider", "payment-service", "support-service"],
    transactions: ["subscription", "usage", "support", "invoice", "refund"],
    cascade_kind: "service-dependency",
    additional_cascade_kinds: [
      "payment-provider-failure",
      "security-incident-propagation",
    ],
  },
  "retail-supply-network": {
    organizations: [
      ["retailer", "retail"],
      ["manufacturer", "manufacturing"],
      ["logistics-provider", "logistics"],
      ["bank", "professional-services"],
      ["customer-group", "retail"],
    ],
    relationship_kinds: ["supplier", "carrier", "payment-service", "customer"],
    transactions: ["purchase-order", "order", "invoice", "return", "credit"],
    cascade_kind: "fulfilment-dependency",
    additional_cascade_kinds: [
      "supplier-delay",
      "logistics-disruption",
      "upstream-price-change",
    ],
  },
  "professional-services-network": {
    organizations: [
      ["services-firm", "professional-services"],
      ["subcontractor", "professional-services"],
      ["shared-software-provider", "saas"],
      ["client-enterprise", "manufacturing"],
    ],
    relationship_kinds: ["contractor", "software-service", "client"],
    transactions: [
      "service-order",
      "work-acceptance",
      "invoice",
      "payment-notice",
      "employment-movement",
    ],
    cascade_kind: "delivery-dependency",
    additional_cascade_kinds: ["contract-termination"],
  },
  "vendor-outage-cascade": {
    organizations: [
      ["critical-vendor", "saas"],
      ["customer-enterprise", "manufacturing"],
      ["logistics-provider", "logistics"],
      ["payment-provider", "professional-services"],
    ],
    relationship_kinds: ["critical-service", "fulfilment-service", "payment-service"],
    transactions: ["subscription", "usage", "support", "service-credit"],
    cascade_kind: "vendor-outage",
    additional_cascade_kinds: [],
  },
  "customer-default-cascade": {
    organizations: [
      ["customer-enterprise", "retail"],
      ["supplier", "manufacturing"],
      ["bank", "professional-services"],
      ["capacity-vendor", "logistics"],
    ],
    relationship_kinds: ["customer", "credit-provider", "capacity-provider"],
    transactions: ["order", "invoice", "credit", "default-notice"],
    cascade_kind: "customer-default",
    additional_cascade_kinds: [],
  },
  "cross-organization-data-request": {
    organizations: [
      ["request-receiver", "retail"],
      ["software-processor", "saas"],
      ["support-processor", "professional-services"],
      ["delivery-processor", "logistics"],
    ],
    relationship_kinds: ["software-processor", "support-processor", "delivery-processor"],
    transactions: ["data-request", "notification", "response", "remediation"],
    cascade_kind: "data-request",
    additional_cascade_kinds: ["privacy-incident-propagation"],
  },
  "ecosystem-intervention-baseline": {
    organizations: [
      ["retailer", "retail"],
      ["manufacturer", "manufacturing"],
      ["logistics-provider", "logistics"],
      ["bank", "professional-services"],
    ],
    relationship_kinds: ["supplier", "carrier", "payment-service"],
    transactions: ["purchase-order", "delivery", "invoice", "payment"],
    cascade_kind: "capacity-reduction",
    additional_cascade_kinds: ["upstream-capacity-change"],
  },
};

function idFor(config, cluster, namespace, key) {
  return stableId(namespace, {
    scenario_id: config.scenario_id,
    cluster,
    namespace,
    key,
  });
}

function sorted(values) {
  return values.sort((left, right) => left.id.localeCompare(right.id));
}

function eventSort(left, right) {
  return (
    left.tick - right.tick ||
    left.event_type.localeCompare(right.event_type) ||
    canonicalCompactJson(left.payload).localeCompare(canonicalCompactJson(right.payload))
  );
}

function buildCluster(config, template, cluster) {
  const organizations = template.organizations.map(([key, archetypeId], index) => {
    const archetype = getEnterpriseArchetype(archetypeId);
    return {
      id: idFor(config, cluster, "organization", key),
      key,
      archetype_id: archetypeId,
      record: {
        id: idFor(config, cluster, "organization", key),
        kind: `synthetic-${key}`,
        attributes: {
          display_name: `Synthetic ${key.replaceAll("-", " ")} ${cluster + 1}`,
          fictional: true,
          independently_simulated: true,
          archetype: archetypeId,
          departments: archetype.departments,
          offerings: archetype.offerings,
          constraints: archetype.constraints,
        },
      },
      archetype,
      index,
    };
  });
  const organizationIds = organizations.map(({ id }) => id);
  const personId = idFor(config, cluster, "person", "shared-citizen");
  const householdId = idFor(config, cluster, "household", "shared-household");
  const regulatorId = idFor(config, cluster, "institution", "public-institution");
  const networkContractId = idFor(config, cluster, "contract", "network");
  const balanceIds = Object.fromEntries(
    organizations.map(({ id, key }) => [
      id,
      idFor(config, cluster, "balance", key),
    ]),
  );
  const accounts = organizations.map(({ id, key }) => ({
    id: idFor(config, cluster, "account", key),
    kind: "synthetic-operating-account",
    attributes: { owner_id: id, fictional: true },
  }));
  const balances = organizations.map(({ id, key }, index) => ({
    id: balanceIds[id],
    account_id: accounts[index].id,
    resource: "synthetic-credit",
    amount: 10000,
  }));
  const systems = organizations.flatMap(({ id, key, archetype }) =>
    archetype.systems.slice(0, 2).map((system) => ({
      id: idFor(config, cluster, "system", `${key}-${system}`),
      kind: `synthetic-${system}`,
      attributes: { owner_id: id, fictional: true, external: false },
    })),
  );
  const assets = organizations.map(({ id, key, archetype }) => ({
    id: idFor(config, cluster, "asset", key),
    kind: `synthetic-${archetype.assets[0]}`,
    attributes: { owner_id: id, operational: true },
  }));
  const relationships = organizations.slice(0, -1).map((organization, index) => ({
    id: idFor(config, cluster, "relationship", `network-${index}`),
    kind: template.relationship_kinds[index],
    attributes: {
      from_entity_id: organization.id,
      to_entity_id: organizations[index + 1].id,
      declared: true,
    },
  }));
  relationships.push({
    id: idFor(config, cluster, "relationship", "shared-citizen"),
    kind: "multi-context-citizen",
    attributes: {
      from_entity_id: personId,
      to_entity_id: organizations[0].id,
      context_count: organizations.length + 1,
    },
  });
  const contractRecord = {
    id: networkContractId,
    kind: "synthetic-multiparty-network-contract",
    attributes: {
      party_ids: organizationIds,
      active: true,
      authoritative: false,
    },
  };
  const resources = organizations.map(({ id, key, archetype }) => ({
    id: idFor(config, cluster, "resource", key),
    kind: archetype.resource_kind,
    attributes: {
      owner_id: id,
      quantity: archetype.initial_inventory,
      capacity: archetype.initial_capacity,
    },
  }));

  let tick = 1;
  let previousStepId = null;
  const events = [];
  const pushEvent = ({
    eventType,
    eventKind,
    entityId,
    action,
    organizationIds: causalOrganizationIds,
    boundary,
    operational = null,
    financial = null,
    data = null,
    details = {},
  }) => {
    const stepId = idFor(config, cluster, "step", `${events.length + 1}-${action}`);
    events.push({
      tick,
      module_id: "ecosystem-operations",
      event_type: eventType,
      entity_id: entityId,
      payload: {
        contract_version: "aether-ecosystem-event.v1",
        event_kind: eventKind,
        ...(boundary ? { boundary } : {}),
        ...details,
        causal: {
          step_id: stepId,
          previous_step_id: previousStepId,
          actor_id: personId,
          action,
          organization_ids: [...new Set(causalOrganizationIds)],
          operational_consequence: operational,
          financial_consequence: financial,
          data_consequence: data,
        },
      },
    });
    previousStepId = stepId;
    tick += 2;
    return stepId;
  };

  for (const organization of organizations) {
    pushEvent({
      eventType: "ecosystem.identity.context-added",
      eventKind: "identity-context",
      entityId: personId,
      action: `add-${organization.key}-context`,
      organizationIds: [organization.id],
      details: {
        context_id: idFor(config, cluster, "context", organization.key),
        person_id: personId,
        context_owner_id: organization.id,
        role:
          organization.index === 0
            ? "employee"
            : organization.index === organizations.length - 1
              ? "vendor-representative"
              : ["customer", "director", "applicant"][
                  (organization.index - 1) % 3
                ],
      },
    });
  }
  pushEvent({
    eventType: "ecosystem.identity.context-added",
    eventKind: "identity-context",
    entityId: personId,
    action: "add-household-context",
    organizationIds: [organizations[0].id],
    details: {
      context_id: idFor(config, cluster, "context", "household"),
      person_id: personId,
      context_owner_id: householdId,
      role: "household-member",
    },
  });
  pushEvent({
    eventType: "ecosystem.contract.changed",
    eventKind: "contract",
    entityId: organizations[0].id,
    action: "form-network-contract",
    organizationIds,
    details: {
      contract_id: networkContractId,
      action: "formed",
      party_ids: organizationIds,
      contract_kind: "multiparty-service-network",
    },
  });

  const boundary = {
    owner_organization_id: organizations[0].id,
    affected_organization_ids: organizationIds.slice(1),
    contract_id: networkContractId,
  };
  for (const transactionKind of template.transactions) {
    if (transactionKind === "employment-movement") {
      pushEvent({
        eventType: "ecosystem.employment.moved",
        eventKind: "transaction",
        entityId: personId,
        action: "move-employment-context",
        organizationIds: organizations.slice(0, 2).map(({ id }) => id),
        boundary,
        operational: { from: organizations[0].id, to: organizations[1].id },
        details: {
          person_id: personId,
          from_organization_id: organizations[0].id,
          to_organization_id: organizations[1].id,
        },
      });
      continue;
    }
    pushEvent({
      eventType: "ecosystem.transaction.recorded",
      eventKind: "transaction",
      entityId: organizations[0].id,
      action: `record-${transactionKind}`,
      organizationIds,
      boundary,
      operational: { transaction_kind: transactionKind, status: "recorded" },
      financial: { amount: 100, unit: "synthetic-credit" },
      details: {
        transaction_id: idFor(
          config,
          cluster,
          "transaction",
          transactionKind,
        ),
        transaction_kind: transactionKind,
        status: "recorded",
        amount: 100,
      },
    });
  }
  const paymentLegs = [
    { organization_id: organizations[0].id, amount: -100 },
    ...organizations.slice(1, -1).map(({ id }) => ({
      organization_id: id,
      amount: 0,
    })),
    { organization_id: organizations.at(-1).id, amount: 100 },
  ];
  pushEvent({
    eventType: "ecosystem.payment.recorded",
    eventKind: "payment",
    entityId: organizations[0].id,
    action: "settle-intermediated-payment",
    organizationIds,
    boundary,
    financial: { amount: 100, reconciled: true },
    details: {
      payment_id: idFor(config, cluster, "payment", "network"),
      legs: paymentLegs,
    },
  });
  if (organizations.length >= 3) {
    if (config.scenario_kind === "retail-supply-network") {
      pushEvent({
        eventType: "ecosystem.delivery.changed",
        eventKind: "delivery",
        entityId: organizations[0].id,
        action: "reject-network-delivery",
        organizationIds: organizations.slice(0, 3).map(({ id }) => id),
        boundary,
        operational: { status: "rejected", quantity: 1 },
        details: {
          delivery_id: idFor(config, cluster, "delivery", "network"),
          sender_id: organizations[0].id,
          carrier_id: organizations[1].id,
          recipient_id: organizations[2].id,
          status: "rejected",
        },
      });
    }
    pushEvent({
      eventType: "ecosystem.delivery.changed",
      eventKind: "delivery",
      entityId: organizations[0].id,
      action: "accept-network-delivery",
      organizationIds: organizations.slice(0, 3).map(({ id }) => id),
      boundary,
      operational: { status: "accepted", quantity: 1 },
      details: {
        delivery_id: idFor(config, cluster, "delivery", "network"),
        sender_id: organizations[0].id,
        carrier_id: organizations[1].id,
        recipient_id: organizations[2].id,
        status: "accepted",
      },
    });
  }
  pushEvent({
    eventType: "ecosystem.data.transferred",
    eventKind: "data-transfer",
    entityId: organizations[0].id,
    action: "transfer-synthetic-record",
    organizationIds: [organizations[0].id, organizations.at(-1).id],
    boundary,
    data: { operation: "copied", lineage_preserved: true },
    details: {
      transfer_id: idFor(config, cluster, "transfer", "network"),
      record_id: idFor(config, cluster, "record", "shared-citizen"),
      from_organization_id: organizations[0].id,
      to_organization_id: organizations.at(-1).id,
      operation: "copied",
    },
  });
  pushEvent({
    eventType: "ecosystem.obligation.changed",
    eventKind: "obligation",
    entityId: organizations[0].id,
    action: "record-network-deadline",
    organizationIds,
    boundary,
    operational: { status: "notified", deadline_tick: tick + 6 },
    details: {
      obligation_id: idFor(config, cluster, "obligation", "network"),
      obligation_kind: "notification-and-remediation",
      status: "notified",
      deadline_tick: tick + 6,
    },
  });
  pushEvent({
    eventType: "ecosystem.obligation.changed",
    eventKind: "obligation",
    entityId: organizations[0].id,
    action: "remediate-network-obligation",
    organizationIds,
    boundary,
    operational: { status: "remediated", deadline_met: true },
    details: {
      obligation_id: idFor(config, cluster, "obligation", "network"),
      obligation_kind: "notification-and-remediation",
      status: "remediated",
      deadline_tick: tick + 4,
    },
  });
  pushEvent({
    eventType: "ecosystem.contract.changed",
    eventKind: "contract",
    entityId: organizations[0].id,
    action: "amend-network-contract",
    organizationIds,
    details: {
      contract_id: networkContractId,
      action: "amended",
      party_ids: organizationIds,
      contract_kind: "multiparty-service-network",
    },
  });
  pushEvent({
    eventType: "ecosystem.contract.changed",
    eventKind: "contract",
    entityId: organizations[0].id,
    action: "renew-network-contract",
    organizationIds,
    details: {
      contract_id: networkContractId,
      action: "renewed",
      party_ids: organizationIds,
      contract_kind: "multiparty-service-network",
    },
  });
  const cascadeKinds = [
    template.cascade_kind,
    ...template.additional_cascade_kinds,
  ];
  const cascadeId = idFor(config, cluster, "cascade", template.cascade_kind);
  for (const cascadeKind of cascadeKinds) {
    const currentCascadeId = idFor(config, cluster, "cascade", cascadeKind);
    organizations.forEach((organization, index) => {
      pushEvent({
        eventType: "ecosystem.cascade.propagated",
        eventKind: "cascade",
        entityId: organization.id,
        action: `propagate-${cascadeKind}-${index + 1}`,
        organizationIds,
        boundary: {
          owner_organization_id: organization.id,
          affected_organization_ids: organizationIds.filter(
            (id) => id !== organization.id,
          ),
          contract_id: networkContractId,
        },
        operational: {
          impact_kind: cascadeKind,
          sequence: index + 1,
        },
        financial: { amount: -(index + 1) * 10 },
        details: {
          cascade_id: currentCascadeId,
          organization_id: organization.id,
          impact_kind: cascadeKind,
          value: -(index + 1) * 10,
        },
      });
    });
  }
  if (config.scenario_kind === "vendor-outage-cascade") {
    pushEvent({
      eventType: "ecosystem.contract.changed",
      eventKind: "contract",
      entityId: organizations[0].id,
      action: "dispute-outage-impact",
      organizationIds,
      details: {
        contract_id: networkContractId,
        action: "disputed",
        party_ids: organizationIds,
        contract_kind: "multiparty-service-network",
      },
    });
  }
  if (config.scenario_kind === "customer-default-cascade") {
    pushEvent({
      eventType: "ecosystem.contract.changed",
      eventKind: "contract",
      entityId: organizations[0].id,
      action: "terminate-defaulted-contract",
      organizationIds,
      details: {
        contract_id: networkContractId,
        action: "terminated",
        party_ids: organizationIds,
        contract_kind: "multiparty-service-network",
      },
    });
  }

  return {
    people: [
      {
        id: personId,
        kind: "synthetic-shared-citizen",
        attributes: { display_name: `Synthetic Citizen ${cluster + 1}`, fictional: true },
      },
    ],
    households: [
      {
        id: householdId,
        kind: "synthetic-household",
        attributes: { member_ids: [personId], fictional: true },
      },
    ],
    organizations: organizations.map(({ record }) => record),
    institutions: [
      {
        id: regulatorId,
        kind: "synthetic-public-institution",
        attributes: { fictional: true, role: "market-and-service-observer" },
      },
    ],
    systems,
    assets,
    relationships,
    contracts: [contractRecord],
    accounts,
    resources,
    balances,
    events,
    moduleOrganizations: organizations.map(({ id, key, archetype_id: archetype }) => ({
      id,
      key,
      archetype,
    })),
    modulePeople: [{ id: personId }],
    balanceIds,
    initialBalances: Object.fromEntries(organizationIds.map((id) => [id, 10000])),
    metadata: {
      cluster,
      organization_ids: organizationIds,
      person_id: personId,
      contract_id: networkContractId,
      cascade_id: cascadeId,
      final_step_id: previousStepId,
      next_tick: tick,
    },
  };
}

export function buildEcosystemScenario(config, { partitionSize = config?.scale } = {}) {
  assertEcosystemConfig(config);
  if (!Number.isSafeInteger(partitionSize) || partitionSize < 1) {
    throw new TypeError("partitionSize must be a positive safe integer");
  }
  const template = templates[config.scenario_kind];
  const clusters = [];
  for (let start = 0; start < config.scale; start += partitionSize) {
    const end = Math.min(start + partitionSize, config.scale);
    for (let cluster = start; cluster < end; cluster += 1) {
      clusters.push(buildCluster(config, template, cluster));
    }
  }
  const flatten = (key) => clusters.flatMap((cluster) => cluster[key]);
  const balanceIds = Object.assign({}, ...clusters.map(({ balanceIds: ids }) => ids));
  const organizationBalances = Object.assign(
    {},
    ...clusters.map(({ initialBalances }) => initialBalances),
  );
  const endTick = Math.max(...clusters.map(({ metadata }) => metadata.next_tick)) + 2;
  const genericInventoryId = stableId("resource", {
    scenario_id: config.scenario_id,
    kind: "ecosystem-composite-inventory",
  });
  const genericCapacityId = stableId("resource", {
    scenario_id: config.scenario_id,
    kind: "ecosystem-composite-capacity",
  });

  return {
    contract_version: "aether-scenario.v1",
    scenario_id: config.scenario_id,
    title: config.title,
    description: config.description,
    seed: config.seed,
    clock: { start_tick: 0, end_tick: endTick, tick_duration_ms: 1000 },
    provenance: {
      origin: "scenario-specification",
      tier: "synthetic",
      authoritative: false,
      external_credentials_used: false,
    },
    research_status: "research-preview",
    limitations: [
      ...config.limitations,
      "Cross-boundary outputs are synthetic and non-authoritative.",
      "Institution and provider behavior uses explicit simplified assumptions.",
    ].sort(),
    modules: [
      {
        module_id: "enterprise-operations",
        config: {
          archetype: "ecosystem-composite",
          constraints: [],
          allow_backorders: false,
          state_machines: [],
          inventory: { resource_id: genericInventoryId, initial_quantity: 0 },
          capacity: {
            resource_id: genericCapacityId,
            initial_available: 100 * config.scale,
            total: 100 * config.scale,
          },
          employment: [],
        },
      },
      {
        module_id: "ecosystem-operations",
        config: {
          organizations: flatten("moduleOrganizations"),
          people: flatten("modulePeople"),
          balance_ids: balanceIds,
          organization_balances: organizationBalances,
        },
      },
    ],
    initial_state: {
      people: sorted(flatten("people")),
      households: sorted(flatten("households")),
      organizations: sorted(flatten("organizations")),
      institutions: sorted(flatten("institutions")),
      systems: sorted(flatten("systems")),
      assets: sorted(flatten("assets")),
      relationships: sorted(flatten("relationships")),
      contracts: sorted(flatten("contracts")),
      accounts: sorted(flatten("accounts")),
      resources: sorted([
        ...flatten("resources"),
        {
          id: genericInventoryId,
          kind: "ecosystem-composite-inventory",
          attributes: { quantity: 0 },
        },
        {
          id: genericCapacityId,
          kind: "ecosystem-composite-capacity",
          attributes: { total: 100 * config.scale },
        },
      ]),
      balances: sorted(flatten("balances")),
      metrics: [],
      observations: [],
    },
    scheduled_events: flatten("events").sort(eventSort),
  };
}

export function ecosystemScenarioMetadata(config) {
  assertEcosystemConfig(config);
  const cluster = buildCluster(config, templates[config.scenario_kind], 0);
  return structuredClone(cluster.metadata);
}

export function buildEcosystemIntervention(config) {
  if (config.scenario_kind !== "ecosystem-intervention-baseline") {
    throw new TypeError("ecosystem intervention requires the intervention baseline");
  }
  const metadata = ecosystemScenarioMetadata(config);
  const organizationId = metadata.organization_ids[1];
  return [
    {
      tick: metadata.next_tick,
      module_id: "ecosystem-operations",
      event_type: "ecosystem.cascade.propagated",
      entity_id: organizationId,
      payload: {
        contract_version: "aether-ecosystem-event.v1",
        event_kind: "cascade",
        boundary: {
          owner_organization_id: organizationId,
          affected_organization_ids: metadata.organization_ids.filter(
            (id) => id !== organizationId,
          ),
          contract_id: metadata.contract_id,
        },
        cascade_id: metadata.cascade_id,
        organization_id: organizationId,
        impact_kind: "capacity-restoration",
        value: 75,
        causal: {
          step_id: stableId("step", {
            scenario_id: config.scenario_id,
            intervention: "capacity-restoration",
          }),
          previous_step_id: metadata.final_step_id,
          actor_id: metadata.person_id,
          action: "restore-upstream-capacity",
          organization_ids: metadata.organization_ids,
          operational_consequence: {
            impact_kind: "capacity-restoration",
            value: 75,
          },
          financial_consequence: null,
          data_consequence: null,
        },
      },
    },
  ];
}
