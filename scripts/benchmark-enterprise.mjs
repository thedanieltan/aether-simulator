import { performance } from "node:perf_hooks";
import {
  buildEnterpriseScenario,
  canonicalJson,
  enterpriseOperationsModule,
  getEnterpriseArchetype,
  SimulationKernel,
} from "../src/index.mjs";

const profiles = (process.argv[2] ?? "1,10,100")
  .split(",")
  .map((value) => Number(value));
if (
  profiles.some(
    (value) => !Number.isSafeInteger(value) || value < 1,
  )
) {
  throw new TypeError("benchmark profiles must be positive safe integers");
}

const cases = [
  ["professional-services", "customer-engagement"],
  ["saas", "saas-lifecycle"],
  ["retail", "order-to-cash"],
  ["logistics", "delivery-exception"],
  ["manufacturing", "order-to-cash"],
];
const simulationKernel = new SimulationKernel({
  modules: [enterpriseOperationsModule],
});
const results = [];

for (const scale of profiles) {
  for (const [archetype, journey] of cases) {
    const config = {
      contract_version: "aether-enterprise-config.v1",
      scenario_id: `benchmark-${archetype}-${scale}`,
      title: `Benchmark ${archetype} scale ${scale}`,
      archetype,
      journey,
      seed: `benchmark-${archetype}`,
      scale,
      options: {
        allow_backorders: false,
        outcome: archetype === "logistics" ? "failed-then-remediated" : archetype === "saas" ? "renew" : "complete",
        failure_mode: archetype === "logistics" ? "delayed-work" : "none",
      },
      limitations: ["Performance profile uses synthetic local research inputs."],
    };
    const archetypeDefinition = getEnterpriseArchetype(archetype);
    const started = performance.now();
    const scenario = buildEnterpriseScenario(config);
    const built = performance.now();
    const exported = simulationKernel.run(scenario);
    const completed = performance.now();
    results.push({
      archetype,
      journey,
      scale,
      people: scenario.initial_state.people.length,
      systems: scenario.initial_state.systems.length,
      assets: scenario.initial_state.assets.length,
      scheduled_events: scenario.scheduled_events.length,
      emitted_events: exported.world.event_log.length,
      capacity_total: archetypeDefinition.initial_capacity * scale,
      build_ms: Number((built - started).toFixed(3)),
      run_ms: Number((completed - built).toFixed(3)),
    });
  }
}

process.stdout.write(
  canonicalJson({
    benchmark_contract: "aether-enterprise-benchmark.v1",
    node: process.version,
    profiles,
    results,
    limitation:
      "Wall-clock results describe this execution only and are not a product ceiling.",
  }),
);
