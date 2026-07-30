const archetypes = {
  "professional-services": {
    departments: ["client-services", "delivery", "finance", "people"],
    roles: ["engagement-lead", "consultant", "finance-specialist", "people-partner"],
    systems: ["relationship-management", "project-delivery", "time-recording", "finance"],
    assets: ["workstation", "delivery-template", "knowledge-library"],
    offerings: ["advisory-engagement", "managed-research-service"],
    workflows: ["lead-to-collection", "employee-lifecycle", "procurement-to-payment"],
    constraints: ["billable-capacity", "approval-before-invoice"],
    resource_kind: "consulting-hour",
    initial_inventory: 0,
    initial_capacity: 160,
    unit_price: 240,
    unit_cost: 90,
    transaction_units: 8,
    service_level_target: 0.95
  },
  saas: {
    departments: ["product", "engineering", "customer-success", "finance"],
    roles: ["product-manager", "engineer", "support-specialist", "billing-specialist"],
    systems: ["subscription-platform", "support-desk", "usage-meter", "finance"],
    assets: ["service-cluster", "deployment-pipeline", "support-playbook"],
    offerings: ["synthetic-subscription", "support-plan"],
    workflows: ["signup-to-renewal", "support-remediation", "employee-lifecycle"],
    constraints: ["service-capacity", "subscription-entitlement"],
    resource_kind: "service-unit",
    initial_inventory: 0,
    initial_capacity: 1000,
    unit_price: 75,
    unit_cost: 18,
    transaction_units: 12,
    service_level_target: 0.99
  },
  retail: {
    departments: ["merchandising", "store-operations", "fulfilment", "finance"],
    roles: ["buyer", "store-associate", "fulfilment-coordinator", "accountant"],
    systems: ["commerce", "order-management", "warehouse", "finance"],
    assets: ["store-fixture", "scanner", "fulfilment-station"],
    offerings: ["synthetic-retail-item", "delivery-service"],
    workflows: ["order-to-cash", "refund", "procurement-to-payment"],
    constraints: ["inventory-availability", "refund-against-payment"],
    resource_kind: "retail-item",
    initial_inventory: 80,
    initial_capacity: 40,
    unit_price: 32,
    unit_cost: 14,
    transaction_units: 5,
    service_level_target: 0.96
  },
  logistics: {
    departments: ["dispatch", "fleet", "customer-operations", "finance"],
    roles: ["dispatcher", "driver", "service-coordinator", "accountant"],
    systems: ["dispatch", "route-planning", "proof-of-delivery", "finance"],
    assets: ["delivery-vehicle", "routing-device", "sorting-bay"],
    offerings: ["synthetic-delivery", "exception-handling"],
    workflows: ["booking-to-delivery", "failed-delivery-remediation", "procurement-to-payment"],
    constraints: ["vehicle-capacity", "delivery-window"],
    resource_kind: "delivery-slot",
    initial_inventory: 0,
    initial_capacity: 24,
    unit_price: 48,
    unit_cost: 21,
    transaction_units: 3,
    service_level_target: 0.94
  },
  manufacturing: {
    departments: ["sales", "production", "procurement", "finance", "people"],
    roles: ["sales-planner", "production-operator", "buyer", "accountant", "people-partner"],
    systems: ["sales-orders", "production-planning", "inventory", "finance", "people"],
    assets: ["production-line", "quality-station", "material-store"],
    offerings: ["synthetic-component", "assembly-service"],
    workflows: ["order-to-production", "procurement-to-payment", "employee-lifecycle"],
    constraints: ["material-availability", "production-capacity", "quality-release"],
    resource_kind: "finished-unit",
    initial_inventory: 30,
    initial_capacity: 64,
    unit_price: 120,
    unit_cost: 58,
    transaction_units: 6,
    service_level_target: 0.92
  }
};

export const ENTERPRISE_ARCHETYPE_IDS = Object.freeze(
  Object.keys(archetypes).sort(),
);

export function getEnterpriseArchetype(archetypeId) {
  const archetype = archetypes[archetypeId];
  if (!archetype) throw new TypeError(`unknown enterprise archetype: ${archetypeId}`);
  return structuredClone(archetype);
}

export function listEnterpriseArchetypes() {
  return ENTERPRISE_ARCHETYPE_IDS.map((id) => ({
    id,
    ...getEnterpriseArchetype(id),
  }));
}
