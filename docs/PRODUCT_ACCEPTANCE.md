# Standalone product acceptance

Candidate: **1.0.0-rc.1**  
Recommendation: **publish as an active-research release candidate**  
Acceptance date: **2026-07-30**

## Accepted standalone workflow

| Product area | State | Acceptance evidence |
|---|---|---|
| Orientation and claim boundary | Accepted | stable routes, visible status, research boundary, accessibility |
| Local projects | Accepted | create, revise, persist, reload, digest-restore, import, export, delete |
| Scenario design | Accepted | 16-entry committed library and validated five-node blueprint |
| Local execution | Accepted | deterministic worker runtime, benchmark envelope, progress, cancellation, reset |
| Citizen and entity exploration | Accepted | unified records, role contexts, events, lineage, provenance |
| Semantic zoom | Accepted | world → enterprise → citizen with one stable identity |
| Scenario laboratory | Accepted, bounded | one fixed economy baseline and declared intervention variants |
| Analysis | Accepted, descriptive | measures, cohorts, declared ancestry, limitations, export |
| Reproduction and export | Accepted | canonical artifacts, project contract, analysis, package boundary |
| Privacy and security | Accepted for stated scope | synthetic fixtures, no telemetry, CSP, public-tree and sensitive scans |

## Engineering evidence

- 95 deterministic Node tests.
- 13 Chromium journeys, including WCAG Axe checks and widths 320, 375, 414,
  and 768 pixels.
- Node.js 20, 22, and 24 Linux acceptance.
- Node.js 20 Windows portability acceptance.
- Ten JSON schemas and all representative contracts validated.
- Enterprise, ecosystem, and economy fixtures validated with zero drift.
- Standalone validator generation with zero drift.
- Static product build and response policy verification.
- Exact npm dry-run package manifest verification.
- Dependency audit with zero known high-severity production vulnerabilities.
- Public-tree and sensitive-content scans with zero findings.
- Explicit personal-identity and private-source scans with zero findings.

## Research claim boundary

This is research software. It is not production-ready, a compliance product, a
legal or regulatory authority, or a calibrated digital twin. No real personal
data is included. Synthetic outputs do not establish real-world compliance,
prediction, policy validity, or causal effects.

Enterprise, Ecosystem, and Economy Depth are deterministic research previews
with explicit simplified assumptions. Connected providers, provider
performance, statistical uncertainty, cross-browser acceptance beyond
Chromium, multi-user operation, and operational service levels are not accepted.

## Known residual risks

- The synchronous kernel exposes coarse phases but not event-level progress or
  mid-tick pause.
- The browser interactive envelope is based on local benchmark observations,
  not universal timing guarantees.
- Project files are local user-controlled inputs and must contain only
  fictional, non-sensitive metadata.
- Browser support beyond the pinned Chromium acceptance remains unverified.
- Package publication and a hosted release announcement remain maintainer
  actions; this record does not perform either.

## Publication decision

The repository is suitable for public release as **active research,
1.0.0-rc.1**, provided the release retains the stated boundaries and required
quality gates. It should not be represented as production-ready or
provider-connected.

