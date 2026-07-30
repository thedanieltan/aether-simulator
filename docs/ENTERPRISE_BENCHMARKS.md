# Enterprise benchmarks

Command:

```bash
npm run benchmark:enterprise
```

Measurement environment: Node.js v24.13.0 on the local Windows development
host. Results are observations from one run, not guarantees or product limits.

| Scale | People per scenario | Build range | Run range |
|---:|---:|---:|---:|
| 1 | 1 | 0.495-3.313 ms | 18.325-42.706 ms |
| 10 | 10 | 0.436-0.878 ms | 21.945-35.293 ms |
| 100 | 100 | 1.137-1.283 ms | 72.130-104.541 ms |

The benchmark runs all five archetypes at each scale. Systems, assets, and
journey event counts reflect archetype structure; people and configured
capacity scale with the profile. The benchmark accepts arbitrary positive
integer profiles, subject to host memory and execution time. It imposes no
product ceiling.

Wall-clock timing varies by host, Node.js version, load, and runtime behavior.
The acceptance suite tests deterministic semantic output, not exact benchmark
duration.
