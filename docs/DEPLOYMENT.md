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
`docs/RESEARCH_STATUS.md` and the WP-AES-05 acceptance record.

## Accepted public target

The static research deployment is available at
`https://aether-simulator.pages.dev`. On 2026-07-30, an immutable deployment
completed the full Playwright workflow, replay equality, Axe analysis, and
responsive checks. This acceptance covers only local deterministic browser
execution; it is not connected-provider or operational-service acceptance.
