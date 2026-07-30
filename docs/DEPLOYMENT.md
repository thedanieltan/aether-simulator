# Deployment

## Static build

```bash
npm ci
npm run verify:ci
npm run build:studio
npm run preview:studio
```

The deployable artifact is `dist/`. It contains static HTML, CSS, font assets,
application JavaScript, and a Web Worker. It requires no server-side runtime,
credential, database, or provider account at execution time.

`public/_headers` defines content-security and browser-hardening headers.
`public/_redirects` makes the single-page entry point portable on compatible
static hosts.

## Cloudflare Pages

An authenticated maintainer can deploy the accepted build with:

```bash
npm run deploy:pages
```

Deployment requires Node.js 22 or newer because the exact deployment CLI is
newer than the simulator’s minimum Node.js runtime.

The command does not belong in pull-request CI and no deployment credential is
stored in the repository. A deployment is not live accepted until its exact
revision has completed a representative browser workflow: load, run, inspect,
checkpoint, replay, branch, compare, export, and verify browser console and
network behavior.

## Rollback

Use the hosting provider’s immutable deployment history to promote the previous
accepted build. Then repeat the live workflow and record the promoted revision.
Deleting user data is not required because the static product has no server-side
data store.

Current deployment and live-acceptance state is recorded in
`docs/RESEARCH_STATUS.md` and the current browser work-package acceptance
record.

## Accepted public target

The static research deployment is available at
`https://aether-simulator.pages.dev`. On 2026-07-30, an immutable deployment
completed the full Playwright workflow, replay equality, Axe analysis, and
responsive checks. This acceptance covers only local deterministic browser
execution; it is not connected-provider or operational-service acceptance.

The WP-AES-06 product foundation was independently accepted at
`https://8d747300.aether-simulator.pages.dev` with six hosted browser journeys
and the required response security policy.

The WP-AES-07 local project workspace was independently accepted at
`https://e3f1a871.aether-simulator.pages.dev` with seven hosted browser
journeys, including a project export/delete/import round trip.

The WP-AES-08 unified entity model was independently accepted at
`https://2a626224.aether-simulator.pages.dev` with citizen/entity inspection
and the complete existing browser acceptance suite.

The WP-AES-09 visual scenario builder was independently accepted at
`https://6d4d4576.aether-simulator.pages.dev` with blueprint validation,
export, exact compilation, and the complete existing browser suite.
