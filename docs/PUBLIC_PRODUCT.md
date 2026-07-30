# Public browser product

The Aether Simulation Studio is a static browser application for configuring,
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
3. Run the world locally in a Web Worker.
4. Inspect its graph, causal timeline, projected state, and lineage facts.
5. Create a checkpoint, replay it, branch with an intervention, and compare the
   results.
6. Download canonical scenario, event, world, checkpoint, comparison, or
   quarantined evidence artifacts.

The pause control creates a deterministic checkpoint after the current
synchronous run. It is not a claim of pre-emptive interruption inside a kernel
tick. Cancel clears the active browser session and does not mutate external
state.

## Claim boundary

Every displayed person, organization, account, event, and measurement is
fictional and synthetic. Outputs are experimental, non-authoritative, and do
not establish real-world outcomes. The browser product does not accept uploads,
connect to providers, or transmit simulation content. Connected calibration
and provider performance remain unvalidated.

