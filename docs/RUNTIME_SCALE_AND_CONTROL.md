# Runtime scale and control

The browser product estimates workload before execution and keeps interactive
runs within configurations represented by the committed local benchmarks.

| Product depth | Browser scale | Browser duration | Evidence |
|---|---:|---:|---|
| Enterprise | 1–100 | 1–1,000,000 ticks | enterprise benchmark scale 100; journey clocks bound actual work |
| Ecosystem | 1–10 | 1–1,000,000 ticks | ecosystem benchmark scale 10 |
| Economy | 1–25 | 1–80 ticks | economy benchmark scale 25 at the browser default 80 ticks |

These bounds protect the interactive single-worker path. They are not product
caps or service-level claims. The public builders, kernel, benchmark commands,
and CLI continue to accept positive safe-integer scales subject to host memory
and execution time. Future benchmark evidence can expand the browser envelope.

## Progress semantics

The worker reports three observable phases: accepted, executing, and
validating. Percentages locate those coarse phases; they do not claim that a
specific percentage of events has run. The deterministic kernel currently
executes synchronously and exposes no per-event progress callback.

Elapsed time is measured by the browser and is not part of canonical output.
Host load, browser version, and scenario density affect wall-clock duration.

## Cancellation and pause

Cancel aborts the pending UI request, terminates the active worker, and creates
a fresh worker. This stops in-flight computation and discards that worker's
session. A following run starts cleanly.

Pause remains a deterministic checkpoint after a synchronous run has completed.
It does not interrupt a reducer or suspend midway through a tick. Mid-tick pause
would require a future cooperative or partitioned kernel execution contract.

## Safety boundary

All execution is local. Runtime controls introduce no provider calls,
credentials, telemetry, server persistence, or real personal data. Workload
estimates are descriptive, not performance guarantees.

