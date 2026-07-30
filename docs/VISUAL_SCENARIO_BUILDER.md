# Visual scenario builder

## Purpose

The visual builder makes a supported scenario configuration legible as a
dependency pipeline. It does not add an alternative simulation format or an
arbitrary execution surface.

## Blueprint contract

`aether-scenario-blueprint.v1` has five ordered nodes:

1. **Premise** — product depth and committed scenario.
2. **Population** — deterministic construction scale.
3. **Simulation time** — requested logical duration.
4. **Intervention** — explicit branch intervention value.
5. **Reproducibility** — deterministic root seed.

Four declared edges connect these nodes in order. The topology is fixed in this
release because the underlying public builders accept this exact configuration;
adding decorative or executable graph nodes would imply behavior the kernel
does not implement.

## Compilation

Compilation validates the contract, node order, edge order, committed scenario
identifier, numeric bounds, and seed. It then returns the same depth, scenario,
scale, duration, intervention, and seed payload consumed by the browser runtime.

The run form and blueprint remain synchronized after a project is opened or a
run configuration is edited. Applying a valid blueprint clears a stale
last-run digest and saves the new configuration when a local project is active.

## Export

A blueprint can be exported as canonical, byte-stable JSON. The export contains
only the supported configuration, node descriptions, and edges. It contains no
world output, project metadata, user code, credentials, provider configuration,
or executable content.

## Boundary

This is a constrained model builder. Drag-and-drop arbitrary nodes, custom code,
plugin execution, provider connections, and uncommitted scenario documents are
not implemented or claimed.
