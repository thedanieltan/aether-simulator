# Product requirements

## Product statement

Aether is a deterministic enterprise simulator for researchers, enterprise
architects, and technically rigorous reviewers. It turns explicit fictional
premises into inspectable worlds, causal event histories, and reproducible
artifacts. It is research software, not an operational system or authority.

## Product thesis

Product depth progresses from one enterprise, to an ecosystem of interacting
organizations and citizens, to an economy of enterprises, households,
institutions, and markets. Technical execution modes are a separate concern.

The product should let a user move through one continuous reasoning loop:

1. orient to a fictional world and its assumptions;
2. design a scenario;
3. run it deterministically;
4. zoom from the world to an enterprise and its synthetic citizens;
5. trace events, state, relationships, and lineage;
6. branch or compare an intervention;
7. export a reproducible research artifact.

## Primary users and jobs

| User | Job | Required evidence |
|---|---|---|
| Simulation researcher | Form and test an explicit hypothesis | seed, version, assumptions, event history, comparison |
| Enterprise architect | Explore organizational and system consequences | enterprise, roles, systems, workflows, dependencies |
| Technical reviewer | Reproduce and challenge a result | canonical inputs, deterministic output, limitations |
| Educator or learner | Understand enterprise interactions safely | fictional examples, guided states, visible boundaries |

## Product areas

| Area | Current state | Intended responsibility |
|---|---|---|
| Overview | Implemented in WP-AES-06 | orientation, status, product map |
| Scenario design | Existing configuration, reorganized in WP-AES-06 | premise, depth, seed, scale, duration, intervention |
| Run workspace | Implemented | local execution and lifecycle controls |
| Explore | Implemented at research-preview scope | graph, timeline, state, lineage |
| Compare | Implemented after a run | deterministic branch comparison |
| Export | Implemented after a run | canonical local artifact downloads |
| Project workspace | Implemented in WP-AES-07 | local project lifecycle, recovery, import, and export |
| Citizen and entity records | Implemented in WP-AES-08 | unified synthetic identity, role context, event, lineage, and provenance view |
| Visual scenario builder | Implemented in WP-AES-09 | constrained visual model composition, validation, compilation, and export |
| Scenario laboratory | Planned for WP-AES-10 | experiment definitions and comparison sets |
| Scale and runtime control | Planned for WP-AES-11 | bounded execution and progress |
| Semantic zoom | Planned for WP-AES-12 | economy-to-enterprise-to-citizen exploration |
| Analysis workspace | Planned for WP-AES-13 | measures, cohorts, causality, uncertainty |
| Scenario library and onboarding | Planned for WP-AES-14 | discoverable examples and guided first run |
| Reliability and packaging | Planned for WP-AES-15 | recovery, portability, release packaging |
| Release acceptance | Planned for WP-AES-16 | complete product-level acceptance record |

## Cross-cutting requirements

- The same supported version, scenario, and seed must produce byte-identical
  canonical output.
- Every represented person is fictional, synthetic, and visibly labelled by
  context.
- Citizens must be inspectable when zooming into an enterprise, including their
  synthetic roles, relationships, workflows, events, and data-lineage facts.
- Product-depth claims must match implemented and tested repository evidence.
- Unavailable actions must explain their prerequisite rather than imitate a
  successful state.
- Core local use must not require credentials, Docker, accounts, or network
  providers.
- Empty, loading, complete, paused, error, and unavailable states must be
  accessible by keyboard and assistive technology.
- No integration surface is in scope before the standalone 1.0 acceptance gate.

## Success criteria

The 1.0 candidate is successful when a new user can create or open a local
project, build and run a fictional enterprise scenario, inspect a citizen
within its enterprise context, compare an intervention, export and reproduce
the result, and understand the model's limitations without consulting private
documentation.

## Non-goals

- Real personal-data processing.
- Operational decision automation.
- Claims of regulatory, legal, economic, or organizational truth.
- Connected-provider validation before the standalone product reaches its 1.0
  acceptance gate.
- Server accounts, collaboration, or production deployment infrastructure.
