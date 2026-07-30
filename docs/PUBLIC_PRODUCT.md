# Aether Enterprise Simulator browser product

The Aether Enterprise Simulator is a static browser application for orienting, configuring,
running, inspecting, branching, comparing, and exporting deterministic
synthetic worlds. It is a research interface over the same public kernel and
scenario builders used by the command line.

## Local use

```bash
npm ci
npm run build:studio
npm run preview:studio
```

Open the local URL printed by Vite. No account, credential, Docker service,
database, or network provider is required.

## Workflow

1. Choose Enterprise, Ecosystem, or Economy Depth and a representative scenario.
2. Set the seed, scale, duration, and intervention value.
   The visual blueprint exposes these inputs as a validated five-node pipeline.
3. Run the world locally in a Web Worker.
4. Inspect its graph, causal timeline, projected state, and lineage facts.
   Use the Entities view to inspect fictional citizens and their role contexts.
5. Create a checkpoint, replay it, branch with an intervention, and compare the
   results.
   For the accepted economy policy scenario, use the laboratory to compare
   several declared interventions against one fixed baseline.
6. Download canonical scenario, event, world, checkpoint, comparison, or
   quarantined evidence artifacts.

Stable static-host routes cover overview, design, run, explore, compare, export,
and research boundaries. A product rail is available on larger screens, and a
keyboard command navigator exposes the same destinations at every size.

Local project persistence, digest-verified recovery, validated project-file
import and export, the visual model builder, citizen/entity exploration, and
browser runtime controls are implemented. Deeper semantic zoom and advanced
analysis remain planned product work; the navigation does not present them as
implemented.

The pause control creates a deterministic checkpoint after the current
synchronous run. It is not a claim of pre-emptive interruption inside a kernel
tick. Phase progress is intentionally coarse because the current kernel does
not emit per-event progress. Cancel aborts the request, terminates the in-flight
worker, and creates a fresh worker; it does not mutate external state.

The browser enforces an interactive safety envelope grounded in the committed
local benchmark observations. It is not a kernel or product ceiling. Larger
configurations can be researched through the local CLI subject to host memory
and execution time.

## Claim boundary

Every displayed person, organization, account, event, and measurement is
fictional and synthetic. Outputs are experimental, non-authoritative, and do
not establish real-world outcomes. The browser product accepts only the
versioned local project-file contract; it does not transmit project or
simulation content or connect to providers. Users must keep project metadata
fictional and non-sensitive. Connected calibration and provider performance
remain unvalidated.
