import { buildLineage } from "./lineage.mjs";
import { pick, seededRandom, stableId } from "./random.mjs";

const departments = ["operations", "finance", "people", "product"];
const roles = ["analyst", "specialist", "manager", "coordinator"];

function syntheticPerson(seedRef, index, kind, random) {
  const department = kind === "employee" ? pick(random, departments) : "external";
  const role = kind === "employee" ? pick(random, roles) : "customer";
  const id = stableId("person", `${seedRef}:${kind}:${index}`);
  return {
    id,
    subject_id: stableId("subject", `${seedRef}:${id}`),
    display_name: `Synthetic Person ${String(index + 1).padStart(3, "0")}`,
    kind,
    department,
    role,
  };
}

function workflow(seedRef, people, systems) {
  const employee = people.find((person) => person.kind === "employee");
  const customer = people.find((person) => person.kind === "customer");
  const steps = [
    ["request-recorded", customer.id, "sales"],
    ["work-assigned", employee.id, "people"],
    ["account-updated", employee.id, "product"],
    ["response-prepared", employee.id, "support"],
  ];
  return {
    id: stableId("workflow", `${seedRef}:customer-support-handoff`),
    kind: "customer-support-handoff",
    status: "completed",
    cross_system: true,
    steps: steps.map(([action, actorId, surface], index) => ({
      sequence: index + 1,
      action,
      actor_id: actorId,
      system_id: systems.find((system) => system.surface === surface).id,
      simulation_tick: 100 + index,
    })),
  };
}

export function generateWorld(seed = 424242) {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new TypeError("seed must be a non-negative safe integer");
  }

  const seedRef = `seed-${seed}`;
  const random = seededRandom(seed);
  const company = {
    id: stableId("enterprise", seedRef),
    name: "Aster Vale Research Cooperative",
    fictional: true,
    operating_model: "synthetic business-services enterprise",
  };
  const systems = [
    ["people", "people-records"],
    ["finance", "finance-ledger"],
    ["sales", "customer-records"],
    ["product", "product-analytics"],
    ["support", "support-workspace"],
    ["security", "identity-directory"],
  ].map(([surface, kind]) => ({
    id: stableId("system", `${seedRef}:${surface}`),
    name: `Synthetic ${surface} system`,
    surface,
    kind,
    external: false,
  }));
  const people = [
    ...Array.from({ length: 4 }, (_, index) =>
      syntheticPerson(seedRef, index, "employee", random),
    ),
    ...Array.from({ length: 2 }, (_, index) =>
      syntheticPerson(seedRef, index + 4, "customer", random),
    ),
  ];
  const workflows = [workflow(seedRef, people, systems)];
  const simulationTick = 103;

  return {
    contract_version: "aether-world.v0.1",
    research_status: "experimental",
    seed,
    world_ref: stableId("world", seedRef),
    simulation_tick: simulationTick,
    provenance: {
      origin: "deterministic-generator",
      tier: "synthetic",
      external_credentials_used: false,
    },
    company,
    systems,
    people,
    workflows,
    pii_lineage: buildLineage(seedRef, people, systems, simulationTick),
  };
}
