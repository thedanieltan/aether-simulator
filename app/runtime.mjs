import professionalServices from "../scenarios/enterprise/professional-services-customer-engagement.json" with { type: "json" };
import saas from "../scenarios/enterprise/saas-customer-lifecycle.json" with { type: "json" };
import retail from "../scenarios/enterprise/retail-intervention-baseline.json" with { type: "json" };
import logistics from "../scenarios/enterprise/logistics-delivery-exception.json" with { type: "json" };
import manufacturing from "../scenarios/enterprise/manufacturing-production-order.json" with { type: "json" };
import enterpriseIntervention from "../scenarios/interventions/enterprise-inventory-buffer.json" with { type: "json" };
import serviceNetwork from "../scenarios/ecosystem/saas-service-network.json" with { type: "json" };
import retailNetwork from "../scenarios/ecosystem/retail-supply-network.json" with { type: "json" };
import vendorOutage from "../scenarios/ecosystem/vendor-outage-cascade.json" with { type: "json" };
import dataRequest from "../scenarios/ecosystem/cross-organization-data-request.json" with { type: "json" };
import ecosystemIntervention from "../scenarios/ecosystem/ecosystem-intervention-baseline.json" with { type: "json" };
import stableEconomy from "../scenarios/economy/stable-baseline.json" with { type: "json" };
import demandShock from "../scenarios/economy/demand-shock-recovery.json" with { type: "json" };
import supplyShock from "../scenarios/economy/supply-chain-shock.json" with { type: "json" };
import creditShock from "../scenarios/economy/credit-tightening-default.json" with { type: "json" };
import policyEconomy from "../scenarios/economy/policy-intervention-baseline.json" with { type: "json" };
import employerFailure from "../scenarios/economy/major-employer-failure.json" with { type: "json" };
import {
  buildEnterpriseScenario,
} from "../src/enterprise/scenario-builder.mjs";
import {
  compareEnterpriseRuns,
  validateEnterpriseInvariants,
} from "../src/enterprise/analysis.mjs";
import { enterpriseOperationsModule } from "../src/modules/enterprise-operations.mjs";
import {
  buildEcosystemIntervention,
  buildEcosystemScenario,
  ecosystemScenarioMetadata,
} from "../src/ecosystem/scenario-builder.mjs";
import {
  compareEcosystemRuns,
  validateEcosystemInvariants,
} from "../src/ecosystem/analysis.mjs";
import { ecosystemOperationsModule } from "../src/modules/ecosystem-operations.mjs";
import {
  buildEconomyIntervention,
  buildEconomyScenario,
} from "../src/economy/scenario-builder.mjs";
import {
  compareEconomyRuns,
  validateEconomyInvariants,
} from "../src/economy/analysis.mjs";
import { economyOperationsModule } from "../src/modules/economy-operations.mjs";
import { SimulationKernel } from "../src/kernel/kernel.mjs";

const configs = {
  enterprise: {
    "professional-services-customer-engagement": professionalServices,
    "saas-customer-lifecycle": saas,
    "retail-intervention-baseline": retail,
    "logistics-delivery-exception": logistics,
    "manufacturing-production-order": manufacturing,
  },
  ecosystem: {
    "saas-service-network": serviceNetwork,
    "retail-supply-network": retailNetwork,
    "vendor-outage-cascade": vendorOutage,
    "cross-organization-data-request": dataRequest,
    "ecosystem-intervention-baseline": ecosystemIntervention,
  },
  economy: {
    "stable-baseline": stableEconomy,
    "demand-shock-recovery": demandShock,
    "supply-chain-shock": supplyShock,
    "credit-tightening-default": creditShock,
    "policy-intervention-baseline": policyEconomy,
    "major-employer-failure": employerFailure,
  },
};

function definition(depth) {
  if (depth === "enterprise") {
    return {
      kernel: new SimulationKernel({ modules: [enterpriseOperationsModule] }),
      build: buildEnterpriseScenario,
      validate: validateEnterpriseInvariants,
      compare: compareEnterpriseRuns,
    };
  }
  if (depth === "ecosystem") {
    return {
      kernel: new SimulationKernel({
        modules: [enterpriseOperationsModule, ecosystemOperationsModule],
      }),
      build: buildEcosystemScenario,
      validate: validateEcosystemInvariants,
      compare: compareEcosystemRuns,
    };
  }
  if (depth === "economy") {
    return {
      kernel: new SimulationKernel({ modules: [economyOperationsModule] }),
      build: buildEconomyScenario,
      validate: validateEconomyInvariants,
      compare: compareEconomyRuns,
    };
  }
  throw new TypeError(`unsupported product depth: ${depth}`);
}

function configure(payload) {
  const source = configs[payload.depth]?.[payload.scenario];
  if (!source) throw new TypeError(`unknown scenario: ${payload.depth}/${payload.scenario}`);
  return {
    ...structuredClone(source),
    seed: payload.seed,
    scale: Number(payload.scale),
    ...(payload.depth === "economy"
      ? { periods: Math.max(3, Math.ceil(Number(payload.duration) / 20)) }
      : {}),
  };
}

function summary(session) {
  const world = session.exported.world;
  const moduleState = world.projected_state.module_state;
  return {
    depth: session.depth,
    config: structuredClone(session.config),
    scenario: structuredClone(session.scenario),
    exported: structuredClone(session.exported),
    checkpoint: structuredClone(session.checkpoint),
    branch: structuredClone(session.branch),
    comparison: structuredClone(session.comparison),
    metrics: {
      events: world.event_log.length,
      entities: Object.values(world.entities).reduce((sum, values) => sum + values.length, 0),
      relationships: world.relationships.length,
      observations: world.observations.length,
    },
    module_state: structuredClone(moduleState),
  };
}

export class BrowserSimulationRuntime {
  #session = null;

  execute(command, payload = {}) {
    if (command === "run" || command === "restore") {
      const config = configure(payload);
      const engine = definition(payload.depth);
      const scenario = engine.build(config);
      const untilTick = Math.min(Number(payload.duration), scenario.clock.end_tick);
      const exported = engine.kernel.run(scenario, { untilTick });
      const invariants = engine.validate(exported);
      if (!invariants.valid) throw new TypeError(invariants.errors.join("; "));
      this.#session = {
        depth: payload.depth,
        config,
        scenario,
        engine,
        exported,
        checkpoint: null,
        branch: null,
        comparison: null,
      };
      const restored = summary(this.#session);
      if (
        command === "restore"
        && payload.expectedDigest
        && restored.exported.digest !== payload.expectedDigest
      ) {
        this.#session = null;
        throw new TypeError(
          "stored project result does not match this simulator version; run it again",
        );
      }
      return restored;
    }
    if (command === "cancel") {
      this.#session = null;
      return null;
    }
    if (!this.#session) throw new TypeError("run a scenario first");
    const session = this.#session;
    if (command === "checkpoint" || command === "pause") {
      const lastTick = session.exported.world.clock.current_tick;
      const tick = Math.max(
        session.scenario.clock.start_tick,
        Math.min(lastTick, Math.floor(lastTick / 2)),
      );
      session.checkpoint = session.engine.kernel.checkpoint(session.scenario, tick);
      return summary(session);
    }
    if (command === "resume") {
      if (!session.checkpoint) throw new TypeError("create a checkpoint before resume");
      session.exported = session.engine.kernel.resume(
        session.scenario,
        session.checkpoint,
        { untilTick: session.exported.world.clock.current_tick },
      );
      return summary(session);
    }
    if (command === "replay") {
      session.exported = session.engine.kernel.replay(
        session.scenario,
        session.exported.world.event_log,
        { untilTick: session.exported.world.clock.current_tick },
      );
      return summary(session);
    }
    if (command === "branch") {
      if (!session.checkpoint) this.execute("checkpoint");
      let interventions = [];
      if (
        session.depth === "enterprise" &&
        session.config.scenario_id === retail.scenario_id
      ) {
        interventions = structuredClone(enterpriseIntervention.interventions);
      } else if (session.depth === "ecosystem") {
        const metadata = ecosystemScenarioMetadata(session.config);
        session.checkpoint = session.engine.kernel.checkpoint(
          session.scenario,
          metadata.next_tick - 1,
        );
        interventions = buildEcosystemIntervention(session.config);
      } else if (session.depth === "economy") {
        session.checkpoint = session.engine.kernel.checkpoint(session.scenario, 16);
        interventions = buildEconomyIntervention(session.config, {
          tick: 17,
          transfer: Number(payload.intervention ?? 12),
        });
      }
      session.branch = session.engine.kernel.branch(
        session.scenario,
        session.checkpoint,
        interventions,
        { untilTick: session.scenario.clock.end_tick },
      );
      session.comparison = session.engine.compare(
        session.exported,
        session.branch,
        { browser_intervention: Number(payload.intervention ?? 12) },
      );
      return summary(session);
    }
    if (command === "compare") {
      if (!session.comparison) throw new TypeError("create a branch before compare");
      return summary(session);
    }
    throw new TypeError(`unknown browser command: ${command}`);
  }
}
