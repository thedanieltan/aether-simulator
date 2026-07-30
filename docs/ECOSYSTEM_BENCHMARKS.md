# Ecosystem benchmarks

Command:

```bash
npm run benchmark:ecosystem
```

Observation environment: Node.js v24.13.0 on the local Windows development
host. Results are observations, not guarantees or product limits.

| Network scale | Organizations | Citizens | Events | Build | Run |
|---:|---:|---:|---:|---:|---:|
| 1 | 5 | 1 | 46 | 4.141 ms | 160.934 ms |
| 5 | 25 | 5 | 230 | 8.362 ms | 3,200.079 ms |
| 10 | 50 | 10 | 460 | 21.149 ms | 11,927.113 ms |

The default tiers intentionally remain small enough for routine local
acceptance. The script accepts arbitrary positive integer profiles as command
arguments. Larger single-process worlds increase cloning, scheduling, and
projection cost; future work may add deterministic worker partitioning without
changing semantic output.
