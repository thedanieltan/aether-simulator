# Research status

Repository recommendation: **active research**.

| Classification | Capability or finding |
|---|---|
| Implemented | Versioned world kernel; formal schemas; deterministic clock, event scheduler, identifiers and random substreams; module lifecycle; append-only events and projections; canonical exports; checkpoint/resume; replay; branch and compare; CLI; deterministic v0.1 migration; optional evidence normalization |
| Tested | Same-input byte identity; different-seed divergence; registration-order independence; replay equivalence; checkpoint-resume equivalence; shared branch history; fail-closed contracts; 50,000-ID collision corpus; migration fixture; facts-only non-authoritative evidence behavior; public-tree and sensitive-content policy |
| Partially implemented | Enterprise depth: one bounded scenario exercises every world collection and one operational module, but does not model a complete enterprise |
| Planned | Richer enterprise domain modules and scenarios; ecosystem and economy product depths; local OSS realism; connected calibration |
| Rejected | Real personal data, external credentials, implicit authority, provider state in deterministic core, and arbitrary product scale caps |
| Product-invalidated | Treating synthetic output, provider output, or evidence normalization as proof of real-world compliance |
| Not live accepted | Every capability in this repository; no deployment or connected workflow was performed or accepted |
| Unimplemented | Complete enterprise depth, ecosystem depth, economy depth, partitioned execution, connected-provider validation, and a public browser product |

## Work-package state

- **Implementation:** WP-AES-01 implemented and verified in the clean public
  release candidate.
- **Deployment:** not performed and not claimed.
- **Live acceptance:** not performed and not claimed.

This is research software. It is not production-ready, a compliance product,
or a legal or regulatory authority. No real personal data is included.
Synthetic outputs do not establish real-world compliance. Separate private
product development is outside this repository and outside the stated purpose
of Aether.
