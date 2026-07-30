# CI/CD quality gate

## Required checks

The repository uses one read-only GitHub Actions workflow:

| Check | Environment | Required behavior |
|---|---|---|
| `acceptance (node 20)` | Ubuntu, minimum supported Node.js | Clean locked install, build, complete test suite, schemas, fixtures, deterministic fixture regeneration, public-tree policy, sensitive-content scan, package boundary, and dependency audit |
| `runtime (node 22)` | Ubuntu | Canonical deterministic acceptance |
| `runtime (node 24)` | Ubuntu | Canonical deterministic acceptance |
| `portability (windows, node 20)` | Windows | Canonical deterministic acceptance |

`npm run verify:ci` is the canonical CI-parity command. Contributors must run
it locally before requesting review. The runtime and portability jobs run the
same `npm run verify` acceptance command used within that gate.

## Workflow security

- Workflow permissions are read-only.
- Action dependencies are pinned to full commit SHAs.
- Checkout does not persist GitHub credentials.
- Dependency installation uses the committed lockfile and disables lifecycle
  scripts.
- Pull requests run with `pull_request`, never `pull_request_target`.
- Concurrent runs for an obsolete revision are cancelled.
- Every job has a timeout.
- Weekly dependency update proposals cover npm and GitHub Actions.

The repository policy rejects unpinned action references, workflow write
permissions, unsafe pull-request execution, unexpected GitHub configuration,
fixture drift, blocked package content, sensitive material, and unexpected
public-tree content.

## Deployment boundary

There is no continuous-deployment workflow in the current research packages.
No hosted product or runtime has been implemented, accepted, or authorized for
deployment. Deployment automation belongs to the public-product work package
and must add environment protection, immutable build provenance, deployment
smoke tests, and rollback evidence before it can be treated as a CD gate.

## Platform enforcement

The `main` branch requires all four runner-backed checks with strict
up-to-date-branch enforcement. Changes must use a pull request, conversations
must be resolved, history must remain linear, administrators are included, and
force pushes and branch deletion are disabled.

The initial private-repository run could not allocate runners because of the
account billing/spending state. After public visibility was enabled, the same
revision completed all Ubuntu and Windows jobs successfully on 2026-07-30.
