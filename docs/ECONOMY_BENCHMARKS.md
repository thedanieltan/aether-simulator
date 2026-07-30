# Economy benchmarks

Observed locally on Windows with Node.js v24.13.0:

| Scale | Citizens | Firms/nonprofits | Banks | Events | Build ms | Run ms |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 3 | 1 | 17 | 10.784 | 27.895 |
| 10 | 10 | 30 | 10 | 170 | 4.658 | 1031.392 |
| 25 | 25 | 75 | 25 | 425 | 4.789 | 6201.184 |

These measurements are descriptive observations from one synthetic local run,
not service-level claims. Runtime depends on host, Node.js version, scenario,
and event density. Warm-up effects can make a larger build appear faster than
the first small build.

Run `npm run benchmark:economy -- 1 10 25` with any positive safe-integer
profiles supported by the host. No product ceiling is imposed. The benchmark
uses deterministic partition planning and the canonical single-process kernel.
