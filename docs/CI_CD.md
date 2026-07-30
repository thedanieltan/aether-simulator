# CI/CD quality gate

## Required checks

The repository uses one read-only GitHub Actions workflow:

| Check | Environment | Required behavior |
|---|---|---|
| `acceptance (node 20)` | Ubuntu, minimum supported Node.js | Clean locked install, build, complete test suite, schemas, fixtures, deterministic fixture regeneration, public-tree policy, sensitive-content scan, package boundary, and dependency audit |
| `runtime (node 22)` | Ubuntu | Canonical deterministic acceptance |
| `runtime (node 24)` | Ubuntu | Canonical deterministic acceptance |
| `portability (windows, node 20)` | Windows | Canonical deterministic acceptance |
| `browser studio (chromium)` | Ubuntu, Chromium | Static build, complete lifecycle journey, replay equality, accessibility, and responsive acceptance |

`npm run verify:ci` is the canonical CI-parity command. Contributors must run
it locally before requesting review. The runtime and portability jobs run the
same `npm run verify` acceptance command used within that gate.
Browser contributors must also run `npm run test:e2e` after installing the
Playwright Chromium runtime.

## Workflow security

- Workflow permissions are read-only.
- Action dependencies are pinned to full commit SHAs.
- Checkout does not persist GitHub credentials.
- Every runner asserts that the committed npm lockfile is version 3 and matches
  the package identity before dependency installation.
- Dependency installation runs from the explicit workspace directory and
  disables lifecycle scripts.
- Pull requests run with `pull_request`, never `pull_request_target`.
- Concurrent runs for an obsolete revision are cancelled.
- Every job has a timeout.
- Weekly dependency update proposals cover npm and GitHub Actions.

The repository policy rejects unpinned action references, workflow write
permissions, unsafe pull-request execution, unexpected GitHub configuration,
fixture drift, blocked package content, sensitive material, and unexpected
public-tree content.

## Deployment boundary

There is no credential-bearing continuous-deployment workflow. The accepted
static artifact can be deployed manually with the documented Pages command;
provider credentials remain outside GitHub Actions and the repository.
Implementation, protected integration, deployment, and live acceptance are
recorded separately in the work-package acceptance evidence.

## Platform enforcement

The `main` branch requires all five runner-backed checks with strict
up-to-date-branch enforcement. Changes must use a pull request, conversations
must be resolved, history must remain linear, administrators are included, and
force pushes and branch deletion are disabled.

The initial private-repository run could not allocate runners because of the
account billing/spending state. After public visibility was enabled, the same
revision completed all Ubuntu and Windows jobs successfully on 2026-07-30.
