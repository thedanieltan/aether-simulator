# CI/CD quality gate

## Required checks

The repository uses one read-only GitHub Actions workflow:

| Check | Environment | Required behavior |
|---|---|---|
| `acceptance (node 20)` | Ubuntu, minimum supported Node.js | Clean locked install, build, 38-test suite, schemas, fixtures, deterministic fixture regeneration, public-tree policy, sensitive-content scan, package boundary, and dependency audit |
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

The checks are designed to be required before merge. GitHub branch protection
and repository rulesets are unavailable for this private repository on its
current plan. Until the plan or visibility supports those controls, the owner
must keep pull requests in draft or unmerged state whenever any check is
missing or failing.

GitHub-hosted jobs also require an account able to start Actions runners.
Account billing or spending-limit failures prevent hosted verification from
running and cannot be repaired in repository code.
